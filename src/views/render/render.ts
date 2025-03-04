export interface NodeType {
  type: string
  children: NodeType | string
}
// 创建一个渲染器
function createRenderer() {
  // 挂载函数
  function mountElement(n: NodeType, container: Element) {
    // 创建dom元素
    const el = document.createElement(n.type);
    // 如果children是文本节点,则直接设置到textContent里面
    if (typeof el.children === 'string') {
      el.textContent = el.children;
    }
    // 挂载
    container.appendChild(el);
  }
  function patch(n1: NodeType, n2: NodeType, container: Element) {
    // 如果旧的node不存在,说明是挂载
    if (!n1) {
      return mountElement(n2, container);
    }
    return '...';
  }
  function render(vnode: NodeType, container: Element & { _vnode: NodeType }) {
    // 有新的node树,新增or更新,挂载
    if (vnode) {
      patch(container._vnode, vnode, container);
    }
    // 没有新node树,则是卸载
    else {
      container.innerHTML = '';
    }
    container._vnode = vnode;
  }
  // function hydrate(vnode: any, container: Element) {

  // }
  return { render };
}
export default createRenderer;
