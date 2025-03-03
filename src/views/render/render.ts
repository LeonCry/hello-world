// 创建一个渲染器
function createRenderer() {
  function render(vnode: any, container: Element & { _vnode: any }) {
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
function patch(oldNode: any, newNode: any, container: Element) {
  console.log(oldNode, newNode, container);
}
export default createRenderer;
