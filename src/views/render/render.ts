import { simpleDiff } from './diff';

export interface NodeType {
  type: string
  props?: Record<string, any>
  children: NodeType[] | string
  el?: HTMLElement
}
export interface CreateRenderOptionsType {
  // 创建元素抽象化函数
  createElement: (tag: string) => HTMLElement
  // 设置文本节点抽象化函数
  setElementText: (el: HTMLElement, text: string) => void
  // 插入元素抽象化函数
  insert: (el: HTMLElement, parent: HTMLElement, anchor?: HTMLElement | null) => void
  // 进行属性设置的抽象画函数
  patchProps: (el: HTMLElement, key: string, value: any) => void
}
// 创建一个渲染器
function createRenderer(options: CreateRenderOptionsType) {
  const { createElement, setElementText, insert, patchProps } = options;
  // 挂载函数
  function mountElement(node: NodeType, container: HTMLElement) {
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
    insert(el, container);
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
        simpleDiff(n1, n2, el, { patch, unmount });
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
  function patch(n1: NodeType | undefined | null, n2: NodeType, container: HTMLElement) {
    // 如果旧的node不存在,说明是挂载
    if (!n1) {
      return mountElement(n2, container);
    }
    // 如果旧的node存在,否则就是更新
    return patchElement(n1, n2);
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
  return { render };
}
export default createRenderer;
