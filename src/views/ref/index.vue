<!-- 写在前面: 本次提交引入ref的概念,并且引入响应丢失问题,以及响应丢失问题的解决方案:toRef以及toRefs -->
<script setup lang="ts">
import { effect, reactive } from '@/utils/reactive';

onMounted(() => {
  function ref(t: any) {
    const wrapper = {
      value: t,
    };
    // 用来判断是ref的value还是原对象本身携带的value
    Object.defineProperty(wrapper, '__v_isRef', { value: true });
    return reactive(wrapper);
  }
  // 解决响应式问题 toRef
  function toRef(obj: Record<keyof any, any>, key: keyof any) {
    const wrapper = {
      // 当对一个代理对象的key使用toRef后,使用.value其实访问的就是原代理对象的key
      get value() {
        return obj[key];
      },
      // 还要可以设置
      set value(val) {
        obj[key] = val;
      },
    };
    Object.defineProperty(wrapper, '__v_isRef', { value: true });
    return wrapper;
  }
  // 衍生出来的toRefs
  function toRefs(obj: Record<keyof any, any>) {
    const ret: Record<keyof any, any> = {};
    for (const key in obj) {
      ret[key] = toRef(obj, key);
    }
    return ret;
  }
  const p = ref(1);
  effect(() => {
    console.log(p.value);
  });
  setTimeout(() => {
    p.value = 10;
  }, 500);
  const obj = reactive({ a: 1, b: 2 });
  const newObj = toRefs(obj);
  effect(() => {
    console.log(newObj.a.value);
  });
  setTimeout(() => {
    obj.a = 10;
  }, 1000);
  effect(() => {
    console.log(obj.b);
  });
  setTimeout(() => {
    newObj.b.value = 20;
  }, 2000);
});
</script>

<template>
  <div />
</template>

<style scoped lang="scss"></style>
