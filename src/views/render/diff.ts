// 本次提交用来实现:
// 如果新节点有一个是新增节点,那么我们需要找到该新增节点,并将其挂载到正确的位置上.
// 如果旧元素在新元素组里面没有找找到,那么我们需要将旧元素删除掉.
import type { NodeType } from './render';

interface DependenciesType {
// 依赖render.ts中的patch函数
  patch: (n1: NodeType | undefined | null, n2: NodeType, container: HTMLElement) => void
  // 依赖render.ts中的unmount函数
  unmount: (node: NodeType | null | undefined) => void
  // 依赖render.ts中的insert函数
  insert: (el: HTMLElement, parent: HTMLElement, anchor?: HTMLElement | ChildNode | null) => void
  // 依赖render.ts中的 mountElement函数
  mountElement: (node: NodeType, container: HTMLElement, anchor?: HTMLElement | ChildNode | null) => void
}
function assertIsNodeType(val: NodeType[] | string): asserts val is NodeType[] {
  if (typeof val === 'string')
    throw new Error('children is not NodeType');
}
// 简单diff算法
// 在进行两组节点的更新时,不能简单的进行卸载和挂载,而是应该在里面进行一行一行的比较更新,并且应该将新旧节点中最小长度作为公共长度进行更新,
// 然后再根据多出来的长度是新节点的还是旧节点的进行挂载或者卸载
function simpleDiff(n1: NodeType, n2: NodeType, container: HTMLElement, dependencies: DependenciesType) {
  assertIsNodeType(n1.children);
  assertIsNodeType(n2.children);
  const { patch, insert, mountElement, unmount } = dependencies;
  const oldChildren = n1.children;
  const newChildren = n2.children;
  const oldLen = oldChildren.length;
  const newLen = newChildren.length;
  let lastIndex = 0;
  // 首先对newNodes进行遍历
  for (let i = 0; i < newLen; i++) {
    // 是否在oldNodes里找到了相同的key
    let find = false;
    const newNode = newChildren[i];
    // 再对oldNodes进行遍历
    for (let j = 0; j < oldLen; j++) {
      const oldNode = oldChildren[j];
      if (newNode.key === oldNode.key) {
        find = true;
        patch(oldNode, newNode, container);
        if (j < lastIndex) {
          const preElement = newChildren[i - 1]?.el;
          if (preElement) {
            const anchor = preElement.nextSibling;
            insert(oldNode.el!, container, anchor);
          }
        }
        else {
          lastIndex = j;
        }
        break;
      }
    }
    // 说明newNode里面有新增的
    if (!find) {
      const addedNode = newNode;
      const anchor = newChildren[i - 1]?.el?.nextSibling;
      // 挂载
      mountElement(addedNode, container, anchor);
    }
  }
  // 寻找newNode里面没有的oldNode的节点
  for (let g = 0; g < oldLen; g++) {
    const oldNode = oldChildren[g];
    const has = newChildren.find(node => node.key === oldNode.key);
    if (!has)
      unmount(oldNode);
  }
}

export { simpleDiff };
