<!-- 写在前面: 本次提交旨在解决effect嵌套问题：
  什么时候effect会发生嵌套？ 当我们一个组件里面又嵌套一个组件的时候，并且希望外面组件发生变化时，内里的组件也发生变化。
  上一次提交的代码是无法完成嵌套功能的，因为内层组件的副作用存储变量activeEffect会永远覆盖掉外层组件的副作用函数。
  effect(() => {
    effect(() => {
      console.log('设置  <p id="file" /> 的值');
      pf!.textContent = proxyObj.file;
    });
    console.log('设置 <p id="text" /> 的值');
    p!.textContent = proxyObj.text;
  });
  当如上述嵌套时，先执行内层组件的副作用函数，然后执行外层组件的副作用函数。就会出现上述问题。

  ## 额外问题：对于内部组件，当我只想更新内部组件时，会发现内部组件更新多次。
  以先执行外层组件的副作用函数，再执行内层组件的副作用函数为例（先内后外同样有问题）
  effect(() => {
    console.log('设置 <p id="text" /> 的值');
    p!.textContent = proxyObj.text;
    effect(() => {
      console.log('设置  <p id="file" /> 的值');
      pf!.textContent = proxyObj.file;
    });
  });
  此时 修改 proxyObj.text 值是没有问题的，内部外部副作用函数都会更新。然而当我再修改 proxyObj.file时，
   proxyObj.text 修改过几次，那么内部组件的副作用函数就会执行几次。初步判断是因为外层组件副作用函数执行时，
   又相当于给内部组件添加了依赖，所以内部组件的副作用函数又会执行一次。
   问题出现在
   const effectFn: anyFnType = function () ....
   这个地方，activeEffect = effectFn;问题是在effect里，effectFn每次都是一个新的函数(地址会变)，
   所以即使是副作用函数是相同的函数，但是外层effectFn每次都是不同的，并存到对应的Set中。
   // 我的初步解法：
   额外声明一个全局栈set，用来存储真正的副作用函数fn，如果set里面有该fn,则在track的时候不再往里添了。
   这个时候effect(...)也不能用匿名函数了，而是改成一个具名函数。
 -->
<script setup lang="ts">
import { last } from 'radash';

type anyFnType = ((...arg: any) => any) & { deps: (Set<anyFnType> | undefined)[] };
onMounted(() => {
  const data: Record<string | symbol, any> = {
    text: '这是初始文本.',
    file: '这是初始file.',
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
    console.log(key, set);
    activeEffect.deps.push(set); // 将当前副作用函数存入到当前副作用函数的deps中
  }
  function trigger(target: Record<string | symbol, any>, key: string | symbol) {
    if (!bubble.get(target))
      return;
    const set = bubble.get(target)?.get(key);
    const runningSet = new Set(set);
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
  const pf = document.getElementById('file')!;
  if (!p || !pf)
    return;
  effect(() => {
    effect(() => {
      console.log('设置  <p id="file" /> 的值');
      pf!.textContent = proxyObj.file;
    });
    console.log('设置 <p id="text" /> 的值');
    p!.textContent = proxyObj.text;
  });
  setTimeout(() => {
    proxyObj.text = '这是修改后的文本.';
  }, 2000);
  setTimeout(() => {
    proxyObj.file = '这是修改后的file.';
  }, 4000);
  console.log(bubble);
});
</script>

<template>
  <div>
    <p id="text" />
    <p id="file" />
  </div>
</template>

<style scoped lang="scss"></style>
