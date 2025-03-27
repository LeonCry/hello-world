<script setup lang="ts">
import type { CreateRenderOptionsType, NodeType } from '@/views/render/render';
import createRenderer from '@/views/render/render';

const baseOptions = { // 创建元素
  createElement(tag: string) {
    return document.createElement(tag);
  },
  // 设置元素的文本节点
  setElementText(el: HTMLElement, text: string) {
    el.textContent = text;
  },
  // 在指定父元素下,在anchor元素前插入el元素
  insert(el: HTMLElement, parent: HTMLElement, anchor: HTMLElement | ChildNode | null = null) {
    parent.insertBefore(el, anchor);
  },
  // 进行属性设置,由于在属性设置的时候,我们要优先使用el.key = value 进行设置
  // (why? 因为setAttribute的值总是会被字符串化,导致一些boolean或者其他类型的值不会被正确设置)
  // 另外,还有一些其他特殊的情况,比如说只读时,不能使用el.key = value,只能用setAttribute,因此此类情况需要单独计算
  patchProps(el: HTMLElement & { _vei?: any }, key: any, value: any) {
    // 加入事件的处理,规定以on开头的都是事件处理
    if (key.startsWith('on')) {
      const eventName = key.slice(2).toLowerCase();
      // 用invoker来扮演一个假的事件处理程序
      const invoker = el._vei || (el._vei = {});
      // 如果给当前DOM的事件处理函数不为空,即是新加/更新事件处理函数
      if (value) {
        // 如果原来的DOM有事件处理函数,则只需要更新下事件处理函数即可
        if (invoker[key]) {
          invoker[key].value = value;
        }
        // 如果原先没有,则需要新增事件
        else {
          invoker[key] = el._vei[key] = (e: Event) => {
            // e.timeStamp是事件发生时的时间,当事件发生时,事件还没有被绑定,则不执行事件处理函数
            // 事件冒泡时,其共享e.timeStamp时间
            if (e.timeStamp < invoker[key].attached)
              return;
            // value可能有多个响应函数
            invoker[key].value.forEach((v: any) => v());
          };
          invoker[key].value = value;
          el.addEventListener(eventName, invoker[key]);
        }
        // 设置当前事件绑定时的时间
        invoker[key].attached = performance.now();
      }
      else {
        invoker[key] && el.removeEventListener(eventName, invoker[key]);
      }
      return;
    }
    function shouldUseSetAttribute() {
      // 例如form
      if (key === 'form')
        return true;
      // 例如 el.key = undefined时
      return key in el;
    }
    if (!shouldUseSetAttribute()) {
      // 例如disabled如果是<input disabled> 那么value = '',因此需要特殊判断
      if (typeof (el as any)[key] === 'boolean' && value === '') {
        (el as any)[key] = true;
      }
      else {
        (el as any)[key] = value;
      }
    }
    else {
      el.setAttribute(key, value);
    }
  },
};
const renderFnOptions: CreateRenderOptionsType = {
  ...baseOptions,
};
onMounted(() => {
  const app = document.getElementById('hello')!;
  const MyComponent = {
    name: 'MyComponent',
    props: {
      title: String,
    },
    // 之前提交的data属于vue2中的内容，虽然在vue3中仍然可以使用，但是不推荐使用
    // setup函数是vue3中的新内容，用于替代vue2中的data，本项目不实现vue3中的data函数
    setup(props: Record<string, any>, setupContext: Record<string, any>) {
      const { emit } = setupContext;
      const count = ref(1);
      emit('change', count.value);
      return {
        count,
      };
    },
    render(this: any) {
      return {
        type: 'div',
        children: `foo 的值是: ${this.count}`,
      };
    },
  };
  const component: NodeType = {
    type: MyComponent,
    props: {
      title: 'this his title',
      other: 'this is other',
      onChange: (value: any) => {
        console.log('the count value is', value);
      },
    },
    children: '',
  };
  const renderer = createRenderer(renderFnOptions);
  renderer.render(component, app);
});
</script>

<template>
  <div id="hello" />
</template>

<style scoped lang="scss">
</style>
