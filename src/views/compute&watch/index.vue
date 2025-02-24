<script setup lang="ts">
import { last } from 'radash';

interface OptionsType {
  // 调度器，连续多次修改响应式数据，但是只会触发最后一次更新的功能。
  scheduler?: (...args: any) => any
  // 是否初始化时立即执行副作用函数。
  lazy?: boolean
}
onMounted(() => {
  const numEleA = document.getElementById('numA')!;
  const numEleB = document.getElementById('numB')!;
  const numEleC = document.getElementById('numC')!;
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
      fn();
      effectStack.pop();
      activeEffect = last(effectStack) || undefined;
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
  effect(() => {
    console.log('设置numA');
    numEleA.textContent = obj.numA;
  });
  effect(() => {
    console.log('设置numB');
    numEleB.textContent = obj.numB;
  });
  effect(() => {
    console.log('设置numC');
    numEleC.textContent = obj.numC;
  });
  console.log('bubble:', bubble);
  setTimeout(() => {
    obj.numA = 10;
    obj.numB = 20;
    obj.numC = 30;
  }, 2000);
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
