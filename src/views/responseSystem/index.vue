<script setup lang="ts">
type anyFnType = (...arg: any) => any;
onMounted(() => {
  // 需要被代理的对象
  const data: Record<string | symbol, any> = {
    text: '这是初始文本.',
  };
  // 用来存储当前正在执行的函数,避免使用硬编码 setPContent
  let activeEffect: anyFnType;
  function effect(fn: anyFnType) {
    activeEffect = fn;
    fn();
  }
  // 用来存储代理对象发生改变时需要执行的函数
  const bubble: Set<anyFnType> = new Set();
  // 代理对象
  const proxyObj = new Proxy(data, {
    get(target, key) {
      // 当代理对象被访问时,将需要执行的函数存入bubble
      bubble.add(activeEffect);
      return target[key];
    },
    set(target, key, value) {
      target[key] = value;
      // 当代理对象被修改时,执行bubble中的函数
      bubble.forEach(fn => fn());
      return true;
    },
  });

  const p = document.getElementById('text');
  if (!p)
    return;
  function setPContent() {
    p!.textContent = proxyObj.text;
  }
  effect(setPContent);
  setTimeout(() => {
    proxyObj.text = '这是修改后的文本';
  }, 3000);
});
</script>

<template>
  <div>
    <p id="text" />
  </div>
</template>

<style scoped lang="scss"></style>
