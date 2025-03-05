// 写在前面: 针对DOM元素上的一些properties进行抽象化
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
    // 如果children是文本节点,则直接设置到textContent里面
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
  // 更新函数 n1:旧node,n2:新node,container:容器
  function patch(n1: NodeType | undefined | null, n2: NodeType, container: HTMLElement) {
    // 如果旧的node不存在,说明是挂载
    if (!n1) {
      return mountElement(n2, container);
    }
    return '...';
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
