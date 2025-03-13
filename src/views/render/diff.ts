// 本次提交用来实现:理想情况下的双端diff流程.(理想情况指,每次进行4次查找时,都可以找到相等的key).
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

// 双端diff算法
function twoEndDiff(n1: NodeType, n2: NodeType, container: HTMLElement, dependencies: DependenciesType) {
  function isKeySame(nodeA: NodeType, nodeB: NodeType) {
    return nodeA.key === nodeB.key;
  }
  const { patch, insert } = dependencies;
  assertIsNodeType(n1.children);
  assertIsNodeType(n2.children);
  const oldChildren = n1.children;
  const newChildren = n2.children;
  // 声明新旧子节点的双端的指针
  let oldStartIndex = 0;
  let oldEndIndex = oldChildren.length - 1;
  let newStartIndex = 0;
  let newEndIndex = newChildren.length - 1;
  // 分别进行:
  // oldStartIndex节点与newStartIndex节点 & oldEndIndex节点与newEndIndex节点 &
  // oldStartIndex节点与newEndIndex节点 & oldEndIndex节点与newStartIndex节点 之间是否能找得到相同的key的元素
  // 大前提是oldEndIndex >= oldStartIndex && newEndIndex >= newStartIndex
  while (oldEndIndex >= oldStartIndex && newEndIndex >= newStartIndex) {
    // debugger;
    console.log(oldEndIndex, oldStartIndex, newEndIndex, newStartIndex);
    const eventIndexes = [
      [oldStartIndex, newStartIndex],
      [oldEndIndex, newEndIndex],
      [oldStartIndex, newEndIndex],
      [oldEndIndex, newStartIndex],
    ];
    for (let k = 0; k < eventIndexes.length; k++) {
      const [curOldIndex, curNewIndex] = eventIndexes[k];
      const curOldNode = oldChildren[curOldIndex];
      const curNewNode = newChildren[curNewIndex];
      // 寻找到了相同key的新旧子元素
      if (isKeySame(curOldNode, curNewNode)) {
        // 先对元素进行更新
        patch(curOldNode, curNewNode, container);
        // 如果两个key相等的node的索引都是头部,则不需要移动位置,如果索引不相同,则是需要移动元素的
        // 都是头部,则需要将该两元素++
        if (isKeySame(curOldNode, oldChildren[oldStartIndex]) && isKeySame(curNewNode, newChildren[newStartIndex])) {
          oldStartIndex++;
          newStartIndex++;
          break;
        }
        // 都是尾部,则需要将该两元素--
        else if (isKeySame(curOldNode, oldChildren[oldEndIndex]) && isKeySame(curNewNode, newChildren[newEndIndex])) {
          oldEndIndex--;
          newEndIndex--;
          break;
        }
        // 移动的情况无非有两种:
        // 1: 旧节点为头部, 新节点为尾部,此时该旧节点需要插入到旧子元素的末尾,并且startIndex++.endIndex--
        // 2: 旧节点为尾部 > 新节点为头部,此时该旧节点需要插入到旧子元素的头部,并且startIndex++.endIndex--
        // 情况1:
        if (isKeySame(curOldNode, oldChildren[oldStartIndex]) && isKeySame(curNewNode, newChildren[newEndIndex])) {
          insert(oldChildren[oldStartIndex].el!, container, oldChildren[oldEndIndex].el!.nextSibling);
          oldStartIndex++;
          newEndIndex--;
        }
        // 情况2
        else if (isKeySame(curOldNode, oldChildren[oldEndIndex]) && isKeySame(curNewNode, newChildren[newStartIndex])) {
          insert(oldChildren[oldEndIndex].el!, container, oldChildren[oldStartIndex].el!);
          oldEndIndex--;
          newStartIndex++;
        }
        break;
      }
    }
  }
}

export { simpleDiff, twoEndDiff };
