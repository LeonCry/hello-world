<!-- 写在前面:

 -->
<script setup lang="ts">
type anyFnType = ((...arg: any) => any) & { deps: (Set<anyFnType> | undefined)[] };
onMounted(() => {
  const data: Record<string | symbol, any> = {
    isShowText: true,
    text: '这是初始文本.',
    file: '这是初始文件file.',
  };
  // 用来存储代理对象发生改变时需要执行的函数
  const bubble = new WeakMap<object, Map<string | symbol, Set<anyFnType>>>();
  let activeEffect: anyFnType | undefined;
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
      activeEffect = effectFn;
      fn();
      activeEffect = undefined;
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

  const p = document.getElementById('text');
  const pf = document.getElementById('file');
  if (!p)
    return;
  // 相当于模板语法中: <p id="text" > {{proxyObj.isShowText ? proxyObj.text : 'nothing'}} </p>
  effect(() => {
    console.log('设置 <p id="text" /> 的值');
    p!.textContent = proxyObj.isShowText ? proxyObj.text : 'nothing';
  });
  effect(() => {
    console.log('设置  <p id="file" /> 的值');
    pf!.textContent = proxyObj.file;
  });
  console.log(bubble);
  setTimeout(() => {
    proxyObj.isShowText = false;
  }, 2000);
  setTimeout(() => {
    proxyObj.isShowText = true;
  }, 2500);
  setTimeout(() => {
    proxyObj.text = '这是修改后的文本.';
  }, 3000);
});

// 对比样例
const reactiveValue = reactive({
  isShowText: true,
  text: '这是初始文本.',
});
setTimeout(() => {
  reactiveValue.isShowText = false;
  // reactiveValue.text = '这是修改后的文本.';
}, 3000);
</script>

<template>
  <div>
    <p id="text" />
    <p id="file" />
    <p>
      reactiveText:
      <span>{{ reactiveValue.isShowText ? reactiveValue.text : 'NOTHING' }}</span>
    </p>
  </div>
</template>

<style scoped lang="scss"></style>
