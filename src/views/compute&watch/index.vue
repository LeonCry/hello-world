<!-- 写在前面:
  本次提交旨在实现vue.js的computed核心功能

 -->
<script setup lang="ts">
import { last } from 'radash';

interface OptionsType {
  // 调度器，连续多次修改响应式数据，但是只会触发最后一次更新的功能。
  scheduler?: (...args: any) => any
  // 是否初始化时立即执行副作用函数。
  lazy?: boolean
}
onMounted(() => {
  const data: Record<string | symbol, any> = {
    numA: 1,
    numB: 2,
    numC: 3,
  };
  let activeEffect: any = null;
  const bubble = new WeakMap();
  const effectStack: any[] = [];
  const effect = (fn: any, options?: OptionsType) => {
    const effectFn = () => {
      activeEffect = effectFn;
      effectStack.push(effectFn);
      // 如果定义的副作用函数是一个getter函数,则需要将其返回
      const res = fn();
      effectStack.pop();
      activeEffect = last(effectStack) || undefined;
      return res;
    };
    effectFn.options = options;
    if (!options?.lazy) {
      effectFn();
    }
    else {
      return effectFn;
    }
  };

  const track = (target: Record<string | symbol, any>, key: string | symbol) => {
    if (!activeEffect)
      return;
    if (!bubble.has(target)) {
      bubble.set(target, new Map());
    }
    const keySet = bubble.get(target);
    if (!keySet?.has(key)) {
      keySet?.set(key, new Set());
    }
    keySet?.get(key)?.add(activeEffect);
  };
  const trigger = (target: Record<string | symbol, any>, key: string | symbol) => {
    if (!bubble.has(target))
      return;
    const keySet = bubble.get(target)?.get(key);
    const runningSet: Set<any> = new Set();
    keySet && keySet.forEach((fn: any) => {
      if (activeEffect !== fn) {
        runningSet.add(fn);
      }
    });
    runningSet && runningSet.forEach((fn: any) => {
      fn();
    });
  };
  const obj = new Proxy(data, {
    get(target, key) {
      track(target, key);
      return target[key];
    },
    set(target, key, value) {
      target[key] = value;
      trigger(target, key);
      return true;
    },
  });
  console.log('bubble:', bubble);
  function computed(getter: (...args: any) => any) {
    // lazy为true时，不会立即执行effect函数,而是将副作用函数返回,由用户自己定义何时调用副作用函数
    const effectFn = effect(getter, { lazy: true })!;
    // 只有当.value的时候才会计算值
    const obj = {
      get value() {
        return effectFn();
      },
    };
    return obj;
  }
  const numTotal = computed(() => obj.numA + obj.numB + obj.numC);
  console.log('numTotal:', numTotal.value);
  obj.numA = 10;
  console.log('numTotal:', numTotal.value);
});
</script>

<template>
  <div>
    <p id="numA" />
    <p id="numB" />
    <p id="numC" />
  </div>
</template>

<style scoped lang="scss"></style>
