<!-- 写在前面: 本次提交将实现一个功能:就是自动脱ref.例如在模板中调用ref数据时,不用再写.value(只针对toref)
 -->
<script setup lang="ts">
import { effect, reactive } from '@/utils/reactive';

onMounted(() => {
  function ref(t: any) {
    const wrapper = {
      value: t,
    };
    // 用来判断是ref的value还是原对象本身携带的value
    Object.defineProperty(wrapper, '__v_isRef', { value: true });
    return reactive(wrapper); ;
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
  // 自动脱ref函数
  function proxyRef(obj: any) {
    return new Proxy(obj, {
      get(target, key, receiver) {
        const val = Reflect.get(target, key, receiver);
        console.log(target);
        // 说明是ref对象
        return val?.__v_isRef === true ? val.value : val;
      },
      set(target, key, newVal, receiver) {
        const val = target[key];
        // 说明是ref对象
        if (val?.__v_isRef) {
          return val.value = newVal;
        }
        return Reflect.set(target, key, newVal, receiver);
      },
    });
  }
  const base = reactive({ a: 1, b: 2 });
  const objRef = toRefs(base);
  const obj = proxyRef(objRef);
  effect(() => {
    console.log(objRef.a.value);
  });
  setTimeout(() => {
    obj.a = 10;
  }, 1000);
});
</script>

<template>
  <div />
</template>

<style scoped lang="scss"></style>
