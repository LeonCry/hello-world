<!-- 写在前面: 当前修改proxyObj.text将会触发响应系统,但是如果修改proxyObj.file,那么响应系统仍旧会更新,
     但是更新的是text,而不是file.这是因为bubble内并没有存储和file相关的函数.这是本次提交需要解决的问题.
 -->
<script setup lang="ts">
type anyFnType = (...arg: any) => any;
onMounted(() => {
  // 需要被代理的对象
  const data: Record<string | symbol, any> = {
    text: '这是初始文本.',
    file: '这是初始文件file.',
  };
  // 用来存储当前正在执行的函数,避免使用硬编码 setPContent
  let activeEffect: anyFnType | undefined;
  function effect(fn: anyFnType) {
    activeEffect = fn;
    fn();
  }
  // 用来存储代理对象发生改变时需要执行的函数
  const bubble = new WeakMap<object, Map<string | symbol, Set<anyFnType>>>();
  // 代理对象
  const proxyObj = new Proxy(data, {
    get(target, key) {
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
      map?.get(key)?.add(activeEffect);
      activeEffect = undefined;
      return target[key];
    },
    set(target, key, value) {
      target[key] = value;
      // 当代理对象被修改时,执行bubble中的函数
      // 首先查看bubble里是否有当前对象
      if (!bubble.get(target))
        return true;
      // 如果有,则看是否有当前key的set
      const set = bubble.get(target)?.get(key);
      set && set?.forEach(fn => fn());
      return true;
    },
  });

  const p = document.getElementById('text');
  const pf = document.getElementById('file');
  if (!p)
    return;
  function setPContent() {
    console.log('触发 setPContent...');
    p!.textContent = proxyObj.text;
  }
  function setPFContent() {
    console.log('触发 setPFContent...');
    pf!.textContent = proxyObj.file;
  }
  effect(setPContent);
  effect(setPFContent);
  setTimeout(() => {
    proxyObj.text = '这是修改后的文本';
    proxyObj.file = '这是修改后的文件file';
  }, 3000);
});
</script>

<template>
  <div>
    <p id="text" />
    <p id="file" />
  </div>
</template>

<style scoped lang="scss"></style>
