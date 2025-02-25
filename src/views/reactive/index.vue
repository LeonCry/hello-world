<!-- 写在前面:
用来创建reactive,本次提交用来精简系统,只保留了响应系统的核心代码
 -->
<script setup lang="ts">
import { last } from 'radash';

onMounted(() => {
  const data: Record<string | symbol, any> = {
    numA: 1,
    numB: 2,
    numC: 3,
  };
  let activeEffect: any = null;
  const bubble = new WeakMap();
  const effectStack: any[] = [];
  const effect = (fn: any) => {
    const effectFn = () => {
      activeEffect = effectFn;
      effectStack.push(effectFn);
      const res = fn();
      effectStack.pop();
      activeEffect = last(effectStack) || undefined;
      return res;
    };
    effectFn();
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
    get(target, key, receiver) {
      track(target, key);
      return Reflect.get(target, key, receiver);
    },
    set(target, key, value, receiver) {
      Reflect.set(target, key, value, receiver);
      trigger(target, key);
      return true;
    },
  });
});
</script>

<template>
  <div>
    <p id="text" />
    <p id="num" />
  </div>
</template>

<style scoped lang="scss"></style>
