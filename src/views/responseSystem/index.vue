<!-- 写在前面: 本次提交解决无限递归循环问题
effect(() => {
    pf.textContent = (proxyObj.num++).toString();
    // 相当于 先读取 后 设置
    proxyObj.num = proxyObj.num + 1;
    pf.textContent = proxyObj.num
});
这段effect中，即读取又设置，导致了无限循环问题。
例如，刚一开始初始化，
effect函数执行；
执行到fn();
fn内部是 proxyObj.num = proxyObj.num + 1;
先读取，触发track,向bubble加入了副作用函数fn;
然后设置，触发trigger,执行副作用函数fn;
然后在fn内部又触发先读取后设置,触发track然后触发trigger无限循环.
 -->
<script setup lang="ts">
import { last } from 'radash';

type anyFnType = ((...arg: any) => any) & { deps: (Set<anyFnType> | undefined)[] };
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
  function effect(fn: (...arg: any) => any) {
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
    runningSet && runningSet?.forEach(fn => fn());
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
    console.log('设置 <p id="num" /> 的值');
    // 相当于 <p id="num" > {{ proxyObj.num++ }} </p>
    proxyObj.num = proxyObj.num + 1;
    pf.textContent = proxyObj.num;
  });
  setTimeout(() => {
    proxyObj.num = 1;
  }, 2000);
  console.log(bubble);
});
</script>

<template>
  <div>
    <p id="text" />
    <p id="num" />
  </div>
</template>

<style scoped lang="scss"></style>
