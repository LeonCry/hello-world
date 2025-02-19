<!-- 写在前面: 本次修改涉及到的是分支切换（三元表达式）时，会产生多余的副作用函数问题，
多余副作用问题:
  如果 isShowText 初始值是true, p!.textContent = proxyObj.isShowText ? proxyObj.text : 'nothing';
  当设置isShowText的值为false之后，p!.textContent的值就是nothing了，这个时候再修改proxyObj.text，虽然界面没有更新，
  但是副作用函数仍旧会执行，这就是多余副作用问题。

本次提交旨在解决多余副作用的问题。解决方法就是:
  在每次执行副作用函数A之前，都先将所有的依赖集合中把副作用函数A删除掉。
  例如，在执行到：
  setTimeout(() => {
    proxyObj.isShowText = false;
  }, 2000);
  时，就将触发 isShowText 对应的依赖集合中的副作用函数: p!.textContent = proxyObj.isShowText ? proxyObj.text : 'nothing';
  那么在执行副作用函数之前，将该副作用函数从isShowText和text的依赖集合中删除掉。
  然后执行副作用函数中，isShowText被读取到，将副作用函数存入isShowText的依赖集合中。但是text未被读取，就不会存到text的依赖集合中了。
  在执行到：
  setTimeout(() => {
    proxyObj.text = '这是修改后的文本.';
  }, 3000);
  时，由于依赖集合为空，所以不会执行到副作用函数。
 -->
<script setup lang="ts">
type anyFnType = ((...arg: any) => any) & { deps: (Set<anyFnType> | undefined)[] };
onMounted(() => {
  // 需要被代理的对象
  const data: Record<string | symbol, any> = {
    isShowText: true,
    text: '这是初始文本.',
    file: '这是初始文件file.',
  };
  // 用来存储代理对象发生改变时需要执行的函数
  const bubble = new WeakMap<object, Map<string | symbol, Set<anyFnType>>>();
  // 用来存储当前正在执行的函数,避免使用硬编码 setPContent
  let activeEffect: anyFnType | undefined;
  // 设置副作用函数的函数，本次提交进行改造。
  function effect(fn: (...arg: any) => any) {
    // 现在存储到依赖集合的副作用函数改造成了effectFn，可以对effectFn进行改造。
    const effectFn: anyFnType = function () {
      // 每次执行真副作用函数之前，都将所有的依赖集合中把副作用函数A删除掉。
      // 首先遍历activeEffect.deps,将set中的effectFn全部删除
      effectFn.deps?.forEach((v: Set<anyFnType> | undefined) => {
        v?.delete(effectFn);
      });
      // 然后清空activeEffect.deps
      effectFn.deps = [];
      // 然后执行fn
      fn();
    };
    // 用来存储当前副作用函数的依赖集合
    effectFn.deps = [];
    activeEffect = effectFn;
    effectFn();
    // 这是上一次提交时，修改错了的地方，应该是在执行fn()之后再将activeEffect置为undefined，而不是在get里面
    activeEffect = undefined;
  }
  // get时,用来收集当前对象的key的响应函数
  function track(target: Record<string | symbol, any>, key: string | symbol) {
    if (!activeEffect)
      return target[key];
      // 从bubble中查找当前对象是否设置了响应函数
    if (!bubble.get(target)) {
      bubble.set(target, new Map().set(key, new Set()));
    }
    const map = bubble.get(target);
    // 将activeEffect存入到key对应的set中
    if (!map?.get(key)) {
      map?.set(key, new Set());
    }
    const set = map?.get(key);
    set?.add(activeEffect);
    activeEffect.deps.push(set); // 将当前副作用函数存入到当前副作用函数的deps中
  }
  // set时,用来触发bubble中的函数
  function trigger(target: Record<string | symbol, any>, key: string | symbol) {
    // 当代理对象被修改时,执行bubble中的函数
    // 首先查看bubble里是否有当前对象
    if (!bubble.get(target))
      return;
      // 如果有,则看是否有当前key的set
    const set = bubble.get(target)?.get(key);
    set && set?.forEach(fn => fn());
  }
  // 代理对象
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
