import type { NodeType } from './render';

interface DependenciesType {
// 依赖render.ts中的patch函数
  patch: (n1: NodeType | undefined | null, n2: NodeType, container: HTMLElement) => void
  // 依赖render.ts中的unmount函数
  unmount: (node: NodeType | null | undefined) => void
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
  const { patch, unmount } = dependencies;
  const oldChildren = n1.children;
  const newChildren = n2.children;
  const oldLen = oldChildren.length;
  const newLen = newChildren.length;
  const customLen = Math.min(oldLen, newLen);
  for (let i = 0; i < customLen; i++) {
    patch(oldChildren[i], newChildren[i], container);
  }
  // 如果旧节点的长度大于新节点的长度,则多余的旧节点需要被卸载掉
  if (oldLen > newLen) {
    for (let i = customLen; i < oldLen; i++) {
      unmount(oldChildren[i]);
    }
  }
  // 如果新节点的长度大于旧节点的长度,则需要将新节点挂载上
  else {
    for (let i = customLen; i < newLen; i++) {
      patch(null, newChildren[i], container);
    }
  }
}

export { simpleDiff };
