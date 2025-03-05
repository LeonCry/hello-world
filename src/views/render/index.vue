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
  // 进行属性设置,由于在属性设置的时候,我们要优先使用el.key = value 进行设置
  // (why? 因为setAttribute的值总是会被字符串化,导致一些boolean或者其他类型的值不会被正确设置)
  // 另外,还有一些其他特殊的情况,比如说只读时,不能使用el.key = value,只能用setAttribute,因此此类情况需要单独计算
  patchProps(el: HTMLElement | any, key: string, value: any) {
    function shouldUseSetAttribute() {
      // 例如form
      if (key === 'form')
        return true;
      // 例如 el.key = undefined时
      return key in el;
    }
    if (!shouldUseSetAttribute()) {
      // 例如disabled如果是<input disabled> 那么value = '',因此需要特殊判断
      if (typeof el[key] === 'boolean' && value === '') {
        el[key] = true;
      }
      else {
        el[key] = value;
      }
    }
    else {
      el.setAttribute(key, value);
    }
  },

};
onMounted(() => {
  const { effect, ref } = VueReactivity;
  const app = document.getElementById('hello')!;
  const renderer = createRenderer(renderFnOptions);
  const node: NodeType = {
    type: 'div',
    children: [
      { type: 'h1', children: 'hello,world', props: { id: 1 } },
      { type: 'h2', children: 'hello,world2', props: { style: 'color: red' } },
      { type: 'h3', children: 'hello,world3' },
    ],
  };
  renderer.render(node, app);
});
</script>

<template>
  <div id="hello" />
</template>

<style scoped lang="scss"></style>
