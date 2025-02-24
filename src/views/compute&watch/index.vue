<!-- 写在前面:
  上次提交简单实现了一个computed函数功能,实现的计算属性只做到了懒计算,也就是说,只有当你真正读取 sumRes.value 的值时,
  它才会进行计算并得到值,但是每次访问 sumRes.value 时都会重新计算,这样就会造成性能浪费,因为 sumRes.value 的值是不会变的,
  这就是为什么我们需要缓存功能的原因,即只有当依赖的数据发生变化时,才会重新计算,否则直接返回上次的计算结果。
  本次提交实现该功能.
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
      // 那么在执行的时候，如果有options.scheduler，则调用scheduler函数
      if (fn?.options?.scheduler) {
        fn?.options?.scheduler(fn);
      }
      else {
        fn();
      }
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
    // 此为缓存的数据
    let value: any;
    // 此为是否缓存的标志: dirty = true,脏数据,表示需要计算再返回,dirty = false表示可以返回缓存的数据
    let dirty = true;
    // 将 dirty = true传入scheduler,调度器会在 obj.numA || obj.numB || obj.numC变化时执行,执行时就说明脏数据了,需要重新计算,缓存不可用了.
    const effectFn = effect(getter, { lazy: true, scheduler: (efn: any) => {
      dirty = true;
      efn();
    } })!;
    const obj = {
      get value() {
        if (!dirty) {
          console.log('走缓存...');
          return value;
        }
        dirty = false;
        value = effectFn();
        return value;
      },
    };
    return obj;
  }
  const numTotal = computed(() => obj.numA + obj.numB + obj.numC);
  console.log('numTotal:', numTotal.value);
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
