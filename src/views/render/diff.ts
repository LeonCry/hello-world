// 本次提交用来实现:非理想情况下的快速diff算法
import type { NodeType } from './render';
import getLis from './getLis';

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
  const { patch, insert, mountElement, unmount } = dependencies;
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
    // 是否跳过当前节点的flag
    let isJump = false;
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
      // 如果 curOldNode 为 null,说明该元素已经被处理过了,则需要 oldStartIndex++ 或者 oldEndIndex--
      if (curOldNode === null) {
        isJump = true;
        curOldIndex === oldStartIndex ? oldStartIndex++ : oldEndIndex--;
        break;
      }
      // 寻找到了相同key的新旧子元素
      if (isKeySame(curOldNode, curNewNode)) {
        // 找到了相同元素,说明额外步骤不需要再执行
        isJump = true;
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
    if (isJump)
      continue;
    // 是否非理想情况
    let isUnideal = false;
    // 此处开始处理非理想情况,获得新节点的头部元素,并在旧节点中头尾之间的node查找key相等的元素
    const newNodeHead = newChildren[newStartIndex];
    for (let d = oldStartIndex + 1; d < oldEndIndex; d++) {
      // 如果查找到相等key的旧节点,则需要将其移动到旧节点头部之前,并将当前旧节点Node设为null,表示其已经处理过了
      // 并且新节点头部newStartIndex也需要下移
      if (newNodeHead.key === oldChildren[d].key) {
        patch(oldChildren[d], newNodeHead, container);
        insert(oldChildren[d].el!, container, oldChildren[oldStartIndex].el);
        oldChildren[d] = null as unknown as any;
        newStartIndex++;
        isUnideal = true;
        break;
      }
    }
    if (isUnideal)
      continue;
    // 此时是新元素,需要将其挂载
    mountElement(newChildren[newStartIndex], container, oldChildren[oldStartIndex].el);
    newStartIndex++;
  }
  // 新元素挂载缺陷处理
  if (oldEndIndex < oldStartIndex && newEndIndex >= newStartIndex) {
    for (let n = newEndIndex; n <= newStartIndex; n++) {
      const newNode = newChildren[n];
      mountElement(newNode, container, oldChildren[oldStartIndex]?.el || oldChildren[oldStartIndex - 1].el?.nextSibling);
    }
  }
  // 旧元素卸载处理
  else if (newEndIndex < newStartIndex && oldEndIndex >= oldStartIndex) {
    for (let o = oldStartIndex; o <= oldEndIndex; o++) {
      const oldNode = oldChildren[o];
      unmount(oldNode);
    }
  }
}
// 快速diff算法
function fastDiff(n1: NodeType, n2: NodeType, container: HTMLElement, dependencies: DependenciesType) {
  assertIsNodeType(n1.children);
  assertIsNodeType(n2.children);
  const oldChildren = n1.children;
  const newChildren = n2.children;
  let newStart = 0;
  let oldStart = 0;
  let newEnd = newChildren.length - 1;
  let oldEnd = oldChildren.length - 1;
  const { patch, mountElement, unmount, insert } = dependencies;
  // 先从头部开始
  while (newChildren[newStart].key === oldChildren[oldStart].key) {
    patch(oldChildren[oldStart], newChildren[newStart], container);
    newStart++;
    oldStart++;
  }
  //   头部结束再从尾部开始预处理
  while (newChildren[newEnd].key === oldChildren[oldEnd].key) {
    patch(oldChildren[oldEnd], newChildren[newEnd], container);
    newEnd--;
    oldEnd--;
  }
  // 如果oldEnd < oldStart 且 newEnd >= newStart，则说明有新增的
  // 需要将新增的挂载到oldStart的前面
  if (oldEnd < oldStart && newEnd >= newStart) {
    for (let i = newStart; i <= newEnd; i++) {
      mountElement(newChildren[i], container, oldChildren[oldStart].el);
    }
  }
  // 如果newEnd < newStart 且 oldEnd >= oldStart，则说明有需要删除的
  // 需要将删除的进行卸载掉
  else if (newEnd < newStart && oldEnd >= oldStart) {
    for (let i = oldStart; i <= oldEnd; i++) {
      unmount(oldChildren[i]);
    }
  }
  else {
    // 处理非理想情况
  // 创建一个新子节点组中key与index的索引表，用该索引表获得旧子节点组中key元素的位置并存到source数组中
    const newKeyIndexes: Record<number, number> = {};
    const source = Array.from({ length: newEnd - newStart + 1 }).fill(-1) as number[];
    // 遍历新元素组
    for (let i = newStart; i <= newEnd; i++) {
      // 将新子元素组里面的元素(key)作为key,元素的索引index作为value进行存储
      newKeyIndexes[newChildren[i].key!] = i;
    }
    // 遍历旧元素组,填补source数组，并更新相同key的元素的props
    for (let j = oldStart; j <= oldEnd; j++) {
      const oldNode = oldChildren[j];
      const newI = newKeyIndexes[oldNode.key!];
      // 说明当前oldNode在新子元素组中找不到，即是需要被卸载掉的元素
      if (typeof newI === 'undefined') {
        unmount(oldNode);
      }
      else {
        source[newI - newStart] = j;
        patch(oldNode, newChildren[newI], container);
      }
    }
    // 此时source(index,value)已经构建完毕，里面保存着新子元素第index个元素在旧子元素组中的位置为value
    // 然后，我们需要判断元素是否需要移动，与简单diff算法一样，当索引是递增的时候，那么元素是不需要移动的，那么此时我们需要找
    // 到一个最大递增序列，这个最大递增序列表示对应的元素组的顺序是确定的，这一组元素是不需要移动的
    const seq = getLis(source);
    // 然后我们创建一个索引n用来指向新子元素组的最后一个元素，创建一个s用来指向seq的最后一个元素
    const n = newEnd - newStart;
    let s = seq.length - 1;
    // 然后从新子元素组开始倒着向上遍历
    for (let nn = n; nn >= 0; nn--) {
      // 如果source[nn]是-1，表示这个元素是新增的，那么需要将其挂载，挂载到当前元素下一个子节点的元素之前
      if (source[nn] === -1) {
        const newNode = newChildren[nn + newStart];
        const anchor = nn + newStart + 1 >= newChildren.length ? null : newChildren[nn + newStart + 1].el;
        mountElement(newNode, container, anchor);
      }
      // 如果 nn === seq[s],则说明进入了最大递增序列中，这些元素是不需要移动的
      else if (nn === seq[s]) {
        s--;
      }
      // 否则，是需要移动元素的，如何移动?
      else {
        const newNode = newChildren[nn + newStart];
        // 此时我们找到该元素的下一个节点
        const anchor = nn + newStart + 1 >= newChildren.length ? null : newChildren[nn + newStart + 1].el;
        insert(newNode.el!, container, anchor);
      }
    }
  }
}

export { fastDiff, simpleDiff, twoEndDiff };
