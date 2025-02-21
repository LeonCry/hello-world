<!-- 写在前面: 本次提交实现调度执行功能，例如vue内连续多次修改响应式数据，但是只会触发最后一次更新的功能。
 -->
<script setup lang="ts">
import { last } from 'radash';

type anyFnType = ((...arg: any) => any)
  & {
    deps: (Set<anyFnType> | undefined)[]
    options: Record<string, any>
  };
onMounted(() => {
  const data: Record<string | symbol, any> = {
    text: '这是初始文本.',
    num: 0,
  };
  // 用来存储代理对象发生改变时需要执行的函数
  const bubble = new WeakMap<object, Map<string | symbol, Set<anyFnType>>>();
  let activeEffect: anyFnType | undefined;
  // 用于存储activeEffect的栈
  const effectStack: anyFnType[] = [];
  // 为effect新增一个选项参数options,允许指定调度器scheduler
  function effect(fn: (...arg: any) => any, options: Record<string, any> = {}) {
    // 每次执行真副作用函数之前，都将所有的依赖集合中把副作用函数A删除掉。
    function cleanup(effectFn: anyFnType) {
      effectFn.deps?.forEach((v: Set<anyFnType> | undefined) => {
        v?.delete(effectFn);
      });
      effectFn.deps = [];
    }
    const effectFn: anyFnType = function () {
      cleanup(effectFn);
      // 入栈
      activeEffect = effectFn;
      effectStack.push(effectFn);
      fn();
      // 出栈
      effectStack.pop();
      activeEffect = last(effectStack) || undefined;
    };
    // 将options挂载到effectFn上
    effectFn.options = options;
    // 用来存储当前副作用函数的依赖集合
    effectFn.deps = [];
    effectFn();
  }
  function track(target: Record<string | symbol, any>, key: string | symbol) {
    if (!activeEffect)
      return target[key];
    if (!bubble.get(target)) {
      bubble.set(target, new Map().set(key, new Set()));
    }
    const map = bubble.get(target);
    if (!map?.get(key)) {
      map?.set(key, new Set());
    }
    const set = map?.get(key);
    set?.add(activeEffect);
    activeEffect.deps.push(set); // 将当前副作用函数存入到当前副作用函数的deps中
  }
  function trigger(target: Record<string | symbol, any>, key: string | symbol) {
    if (!bubble.get(target))
      return;
    const set = bubble.get(target)?.get(key);
    const runningSet: Set<anyFnType> = new Set();
    set && set.forEach((fn) => {
      // 如果当前副作用函数是正在执行的副作用函数，则不执行
      if (activeEffect !== fn)
        runningSet.add(fn);
    });
    runningSet && runningSet?.forEach((efn) => {
      // 那么在执行的时候，如果有options.scheduler，则调用scheduler函数
      if (efn?.options?.scheduler) {
        efn?.options?.scheduler(efn);
      }
      else {
        efn();
      }
    });
  }
  const proxyObj = new Proxy(data, {
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

  const p = document.getElementById('text')!;
  const pf = document.getElementById('num')!;
  if (!p || !pf)
    return;
  effect(() => {
    pf.textContent = proxyObj.num;
    console.log(`设置 <p id="num" /> 的值为:${(proxyObj.num).toString()}`);
  }, {
    // fn就是副作用函数,scheduler本次实现的是vue内连续多次修改响应式数据，但是只会触发最后一次更新的功能。
    scheduler: (fn: anyFnType) => {
      console.log('先调度执行');
      flushJob(fn);
    },
  });
  setTimeout(() => {
    proxyObj.num++;
    proxyObj.num++;
  }, 2000);
  console.log(bubble);
});
// 定义一个队列set，用来存储需要执行的副作用函数
const jobQueue: Set<anyFnType> = new Set();
let isFlushing = false;
// 定义一个函数，用来实现vue内连续多次修改响应式数据，但是只会触发最后一次更新的功能。
// fn: 副作用函数
function flushJob(fn: anyFnType) {
  jobQueue.add(fn);
  if (isFlushing)
    return;
  isFlushing = true;
  // 定义一个微任务，在同步任务执行完后，最后执行微任务队列，执行所有的副作用函数
  Promise.resolve().then(() => {
    jobQueue.forEach((fn) => {
      fn();
    });
  }).finally(() => {
    jobQueue.clear();
    isFlushing = false;
  });
}
</script>

<template>
  <div>
    <p id="text" />
    <p id="num" />
  </div>
</template>

<style scoped lang="scss"></style>
