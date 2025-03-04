<script setup lang="ts">
import type { CreateRenderOptionsType, NodeType } from './render';
import createRenderer from './render';

declare const VueReactivity: {
  effect: (...args: any) => any
  ref: (...args: any) => { value: any }
};
// 给createRenderer传入浏览器的一些API,表明这是用于在浏览器中渲染
const renderFnOptions: CreateRenderOptionsType = {
  // 创建元素
  createElement(tag: string) {
    return document.createElement(tag);
  },
  // 设置元素的文本节点
  setElementText(el: Element, text: string) {
    el.textContent = text;
  },
  // 在指定父元素下,在anchor元素前插入el元素
  insert(el: Element, parent: Element, anchor: Element | null = null) {
    parent.insertBefore(el, anchor);
  },

};
onMounted(() => {
  const { effect, ref } = VueReactivity;
  const app = document.getElementById('hello')!;
  const renderer = createRenderer(renderFnOptions);
  const node: NodeType = {
    type: 'h1',
    children: 'hello,world',
  };
  renderer.render(node, app);
});
</script>

<template>
  <div id="hello" />
</template>

<style scoped lang="scss"></style>
