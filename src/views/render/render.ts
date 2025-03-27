// import { simpleDiff } from './diff';
// import { twoEndDiff } from './diff';
import { fastDiff } from './diff';
import { setCurrentInstance } from './lifeCycle';
import { judgePropsChange, resolveProps } from './utils';

declare const VueReactivity: {
  effect: (...args: any) => any
  ref: (...args: any) => { value: any }
  reactive: (...args: any) => Record<any, any>
  shallowReactive: (...args: any) => Record<any, any>
};
const { effect, shallowReactive } = VueReactivity;
export interface NodeType {
  type: string | any
  props?: Record<string, any>
  children: NodeType[] | string
  el?: HTMLElement
  key?: number
  // 以下为type为组件的属性
  component?: Record<string, any> // 组件实例
}
export interface CreateRenderOptionsType {
  // 创建元素抽象化函数
  createElement: (tag: string) => HTMLElement
  // 设置文本节点抽象化函数
  setElementText: (el: HTMLElement, text: string) => void
  // 插入元素抽象化函数
  insert: (el: HTMLElement, parent: HTMLElement, anchor?: HTMLElement | ChildNode | null) => void
  // 进行属性设置的抽象画函数
  patchProps: (el: HTMLElement, key: string, value: any) => void
}
// 创建一个渲染器
function createRenderer(options: CreateRenderOptionsType) {
  const { createElement, setElementText, insert, patchProps } = options;
  // 挂载函数
  function mountElement(node: NodeType, container: HTMLElement, anchor?: HTMLElement | ChildNode | null) {
    // 创建dom元素,将虚拟node与真实node通过node.el建立联系
    const el = node.el = createElement(node.type);
    // 进行属性properties设置
    for (const key in node?.props) {
      patchProps(el, key, node?.props[key]);
    }
    // 如果children是单个的文本,则直接设置到textContent里面
    if (typeof node.children === 'string') {
      setElementText(el, node.children);
    }
    // 如果children仍然是一棵节点树,则仍旧循环挂载
    else if (Array.isArray(node.children)) {
      node.children.forEach((n) => {
        mountElement(n, el);
      });
    }
    // 挂载
    insert(el, container, anchor);
  }
  // 更新节点函数 n1旧节点 n2 新节点
  function patchElement(n1: NodeType, n2: NodeType) {
    // 由于在挂载的时候已经给旧节点赋值el = 他当时的容器container了,所以可以直接从旧节点.el中取到.
    const el = n2.el = n1.el!;
    // 首先进行props的更新
    const oldProps = n1.props;
    const newProps = n2.props;
    for (const k in newProps) {
      patchProps(el, k, newProps[k]);
    }
    // 如果旧的props在新的props里面没有,则需要将其删掉
    for (const k in oldProps) {
      if (!(k in newProps!)) {
        patchProps(el, k, null);
      }
    }
    // 进行子节点的更新
    patchChildren(n1, n2, el);
  }
  // 子节点的更新函数 n1旧节点 n2新节点
  function patchChildren(n1: NodeType, n2: NodeType, el: HTMLElement) {
    // 新旧子节点之间的关系一共有 3x3=9种, 新旧子节点都有 空节点  单个文本  一组子节点  三种情况,因此要分别判断
    // 首先是新节点是单个文本的情况
    if (typeof n2.children === 'string') {
      // 旧节点为一组子节点情况,卸载旧子节点
      if (Array.isArray(n1.children)) {
        n1.children.forEach(c => unmount(c));
      }
      // 最终结果都是赋予文本
      setElementText(el, n2.children);
    }
    // 然后是新节点是一组节点的情况
    else if (Array.isArray(n2.children)) {
      // 旧节点也是一组节点,涉及到diff算法,此处先简单实现
      if (Array.isArray(n1.children)) {
        fastDiff(n1, n2, el, { patch, unmount, insert, mountElement });
      }
      // 旧节点为单个文本或无
      else {
        setElementText(el, '');
        n2.children.forEach(c => mountElement(c, el));
      }
    }
    // 新节点没有子节点的情况
    else {
      // 旧节点是一组节点,直接卸载
      if (Array.isArray(n1.children)) {
        n1.children.forEach(c => unmount(c));
      }
      // 旧节点为单个文本,直接置空
      else {
        setElementText(el, '');
      }
    }
  }
  // vNode转换为真实dom的函数 n1:旧node,n2:新node,container:容器
  function patch(n1: NodeType | undefined | null, n2: NodeType, container: HTMLElement, anchor?: HTMLElement) {
    // 如果n2.type是对象属性，则说明，这是一个组件，需要通过组件的方式进行挂载与更新
    if (typeof n2.type === 'object') {
      if (!n1)
        mountComponent!(n2, container, anchor);
      else patchComponent!(n1, n2);
      return;
    }
    // 如果旧的node不存在,则直接挂载
    if (!n1) {
      mountElement(n2, container);
    }
    // 如果旧的node存在,则判断旧的node与新的node的type是否一致,不一致则需要先将旧的卸载,再挂载,一致则走更新
    else {
      if (n1.type !== n2.type) {
        unmount(n1);
        return mountElement(n2, container);
      }
      // type是一致的,则走更新流程
      patchElement(n1, n2);
    }
  }
  // 卸载函数
  function unmount(node: NodeType | null | undefined) {
    if (!node?.el)
      return;
    const parent = node?.el?.parentNode;
    parent && parent.removeChild(node.el);
  }
  function render(vnode: NodeType | null, container: HTMLElement & { _vnode?: NodeType | null }) {
    // 有新的node树,新增or更新
    if (vnode) {
      patch(container._vnode, vnode, container);
    }
    // 没有新node树,则是卸载
    else {
      unmount(container._vnode);
    }
    container._vnode = vnode;
  }
  // 组件的挂载
  function mountComponent(node: NodeType, container: HTMLElement, anchor?: HTMLElement) {
    const componentOptions = node.type;
    // 该props为定义在元素上的一些props(<p id=1 title=hello></p>)
    const props = node.props;
    // 该props为组件自身定义的props: (const props = defineProps<{...}>())
    let { render, props: componentProps, setup } = componentOptions;
    // 获取props中componentProps定义的值
    const { realProps, attrs } = resolveProps(componentProps, props!);
    // 此处实现emit
    function emit(event: string, ...args: any) {
      const eventFn = realProps![`on${event[0].toUpperCase()}${event.slice(1)}`];
      eventFn && eventFn(...args);
    }
    // 在setup函数中，可以传入两个参数，第一个是props,第二个是setupContent,其中包括{attrs,slots,emit}等...
    const setupContent = { attrs, emit };
    // 保存组件的实例
    const instance = {
      props: shallowReactive(realProps),
      isMounted: false,
      subTree: null,
      mounted: [],
    };
    // 设置当前组件实例,将setup中生命周期函数执行的callbackFn挂载到当前实例上
    setCurrentInstance(instance);
    // setup函数返回的数据有两种，一种是函数，一种是对象。如果是函数，则表明返回的是render函数，则替代原来的render函数。如果是对象，则表明返回的是实例数据
    const setupResult = setup(shallowReadonly(instance.props), setupContent);
    // setup函数执行完毕，生命周期函数挂载完毕,将当前实例设为null
    setCurrentInstance(null);
    // ---这里应该是beforeCreate生命周期函数---
    let setupState: Record<string, any> | null = null;
    if (typeof setupResult === 'function') {
      render = setupResult;
    }
    else {
      setupState = setupResult;
    }

    // 由于在Vue中，可以直接访问到props里面的数据(并且在模板中不需要通过props.进行访问).
    // 因此，我们需要将props暴露给render函数
    // 创建一个上下文代理对象,该对象用来解决：
    // 如果在组件中访问的是data()里面定义的变量数据，则直接返回该数据，
    // 如果访问的是props里面的，则返回props里面的数据(且props不可更改)
    const renderContext = new Proxy(instance, {
      get(_target, key: string) {
        if (setupState && key in setupState) {
          return setupState[key];
        }
        else {
          return props![key];
        }
      },
      set(_target, key: string, value) {
        if (setupState && key in setupState)
          return setupState[key] = value;
        else if (key in props!)
          throw new Error('不可编辑props');
        return false;
      },
    });

    node.component = instance;
    // ---这里应该是Created生命周期函数---
    // 当status发生变化时，则触发副作用函数
    effect(() => {
      // 获得对应的虚拟DOM
      const subTree = render.call(renderContext, renderContext);
      // 如果当前是未挂载,则直接进行挂载
      if (!node.component?.isMounted) {
        // ---这里应该是beforeMounted生命周期函数---
        patch(null, subTree, container, anchor);
        node.component!.isMounted = true;
        // ---这里应该是Mounted生命周期函数---
        instance.mounted.forEach((fn: any) => fn());
      }
      // 如果已经挂载过了，则直接更新
      else {
        // ---这里应该是beforeUpdate生命周期函数---
        patch(node.component!.subTree, subTree, container, anchor);
        // ---这里应该是updated生命周期函数---
      }
      node.component!.subTree = subTree;
    });
  }
  // 组件的更新:本次提交仅考虑props的情况
  // 当元素的props由{title:xxx} 变为了 {title:hello world}时，这种props的转变其实时在父组件中完成的
  // 在父组件中完成那么mountComponent就不能用了，需要使用组件的更新函数。n1:旧Node n2:新Node
  function patchComponent(n1: NodeType, n2: NodeType) {
    // n2可能是新Node，还没有对其进行component(instance)的挂载
    const instance = n2.component = n1.component;
    // 判断新旧Node是否有Props的更新
    if (judgePropsChange(n1.props!, n2.props!)) {
      const { realProps } = resolveProps(instance!.props, n2.props!);
      // 由于instance上的props是shallowReactive,因此不能直接进行赋值，会顶替掉shallowReactive属性
      Object.entries(realProps).forEach(([key, value]) => {
        instance!.props[key] = value;
      });
      // instance.props变更,reactive代理将会自动触发effect副作用函数.
    }
  }
  return { render };
}
export default createRenderer;
