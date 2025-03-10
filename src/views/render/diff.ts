// 之前实现的简单diff算法是:如果子元素的元素type顺序排序都是相同的话,只是对应的children不同,那么按之前的算法,可以
// 减少dom的操作次数.但是这不符合通用性.本次提交对于Node新增加了一个key的属性,用来解决如果说子元素都是相同元素,或者说
// 子元素的元素类别及数量没有发生变化时(最优解),可以根据key进行元素的移动,而不用进行卸载创建,这将减少dom元素的操作次数.
// 这就是本次提交要实现的功能.
import type { NodeType } from './render';

interface DependenciesType {
// 依赖render.ts中的patch函数
  patch: (n1: NodeType | undefined | null, n2: NodeType, container: HTMLElement) => void
  // 依赖render.ts中的unmount函数
  unmount: (node: NodeType | null | undefined) => void
  // 依赖render.ts中的insert函数
  insert: (el: HTMLElement, parent: HTMLElement, anchor?: HTMLElement | ChildNode | null) => void
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
  const { patch, insert } = dependencies;
  const oldChildren = n1.children;
  const newChildren = n2.children;
  const oldLen = oldChildren.length;
  const newLen = newChildren.length;
  let lastIndex = 0;
  // 首先对newNodes进行遍历
  for (let i = 0; i < newLen; i++) {
    const newNode = newChildren[i];
    // 再对oldNodes进行遍历
    for (let j = 0; j < oldLen; j++) {
      const oldNode = oldChildren[j];
      // 判断newNode和oldNode的key是否相等,如果相等,先对dom元素进行打补丁,包括props,children的更新(至始至终都是在原dom上)
      if (newNode.key === oldNode.key) {
        patch(oldNode, newNode, container);
        //  更新完之后,我们需要进行dom的移动
        // 从index.vue中 oldNode和newNode中我们可以看到,
        // key=3(i=0,j=2)的dom需要移到第一,key=1(i=1,j=0)的需要移到第二,key=2(i=2,j=1)的需要移到第三
        // 只有在oldNode中,其索引值是递增的时候才不需要dom移动,因为在newNode中,其肯定是递增的.(因为我们首先对newNode进行遍历的)
        // 我们需要根据oldNode的j值与最大值lastIndex之间的关系进行dom位置的调整
        // 开始遍历
        // lastIndex = 0, j = 2 ,key = 3的dom不需要移动(2_j > 0_lastIndex,属于递增) lastIndex = j = 2
        // lastIndex = 2, j = 0, key = 1的dom需要移动(0_j < 2_lastIndex,不属于递增),
        // lastIndex = 2, j = 1, key = 2的dom需要移动(1_j < 2_lastIndex,不属于递增)
        // 那么dom具体需要移动到哪里呢?
        // 从index.vue中的newNode中可以看到 key: 1要在 key: 3后面, key: 2 要在 key: 1 后面
        // 所以我们可以取newNode的前一个元素后面插入当前旧元素
        if (j < lastIndex) {
          const preElement = newChildren[i - 1]?.el;
          if (preElement) {
            // 我们定义的insert是在元素前插入,因此需要找到 preElement 的下一个兄弟节点
            const anchor = preElement.nextSibling;
            // container.insertBefore(newNode.el,anchor)
            // oldNode.el和 newNode.el是相等的,都指向当前遍历到的el
            insert(oldNode.el!, container, anchor);
          }
        }
        else {
          lastIndex = j;
        }
        break;
      }
    }
  }
}

export { simpleDiff };
