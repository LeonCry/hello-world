// 写在前面: 由于vue.js还具有跨平台的能力,因此,这些和浏览器有关的API都应该抽象化,以便具备多平台渲染的能力.
export interface NodeType {
  type: string
  children: NodeType[] | string
}
export interface CreateRenderOptionsType {
  // 创建元素抽象化函数
  createElement: (tag: string) => HTMLElement
  // 设置文本节点抽象化函数
  setElementText: (el: Element, text: string) => void
  // 插入元素抽象化函数
  insert: (el: Element, parent: Element, anchor?: Element | null) => void
}
// 创建一个渲染器
function createRenderer(options: CreateRenderOptionsType) {
  const { createElement, setElementText, insert } = options;
  // 挂载函数
  function mountElement(node: NodeType, container: HTMLElement) {
    // 创建dom元素
    const el = createElement(node.type);
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
  // n1:旧node,n2:新node,container:容器
  function patch(n1: NodeType | undefined | null, n2: NodeType, container: HTMLElement) {
    // 如果旧的node不存在,说明是挂载
    if (!n1) {
      return mountElement(n2, container);
    }
    return '...';
  }
  function render(vnode: NodeType | null, container: HTMLElement & { _vnode?: NodeType | null }) {
    // 有新的node树,新增or更新
    if (vnode) {
      patch(container._vnode, vnode, container);
    }
    // 没有新node树,则是卸载
    else {
      container.innerHTML = '';
    }
    container._vnode = vnode;
  }
  return { render };
}
export default createRenderer;
