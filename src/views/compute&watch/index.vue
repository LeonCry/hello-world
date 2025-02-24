<!-- 写在前面:
  本次提交实现简单watch实现
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
    let obj: any;
    const effectFn = effect(getter, { lazy: true, scheduler: (efn: any) => {
      dirty = true;
      // 依赖项发生变化时,手动trigger
      trigger(obj, 'value');
      efn();
    } })!;
    obj = {
      get value() {
        if (!dirty) {
          console.log('走缓存...');
          return value;
        }
        dirty = false;
        value = effectFn();
        // 读取.value时,手动track
        track(obj, 'value');
        return value;
      },
    };
    return obj;
  }
  // 遍历对象,递归访问对象的每一个属性,将每一个属性都track掉,变成响应式的
  function traverse(value: any, seen = new Set()) {
    if (typeof value !== 'object' || value === null || seen.has(value))
      return;
    seen.add(value);
    for (const k in value) {
      traverse(value[k], seen);
    };
    return value;
  }
  function watch(source: any, cb: any) {
    // source有两种情况,一种是obj对象,一种是getter函数形式
    let getter = source;
    if (typeof source !== 'function') {
      getter = () => traverse(source);
    }
    effect(getter, {
      scheduler(efn: any) {
        efn();
        cb();
      },
    });
  }
  watch(obj, () => {
    console.log('numA变化了');
  });
  obj.numA = 2;
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
