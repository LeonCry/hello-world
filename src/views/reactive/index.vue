<!-- 写在前面: 本次提交用来实现数组代理的功能,主要是设置元素值和设置length时的相关问题.
  首先,如果直接读取数组的索引值,是可以触发get拦截的.例如arr[0],通过索引直接设置元素值的时候,也是可以触发set拦截的.
  但是设置的时候会有一个问题,就是如果设置的索引大于了arr本身的length值,那么length属性也会变,就相当于隐式修改了length属性,
  那么也应该触发length属性的副作用函数.
  当然,如果修改length属性,也会隐式的修改数组本身.例如副作用函数访问arr[2],但是修改length属性为2,那么arr[2]的值就会变为undefined
  此时,也应该触发arr[2]的副作用函数,但是arr[0],arr[1]的值并不会发生变化.
 -->
<script setup lang="ts">
import { last } from 'radash';

enum TriggerType {
  ADD = 'ADD',
  SET = 'SET',
  DELETE = 'DELETE',
  ARRAY_SET = 'ARRAY_SET',
  ARRAY_ADD = 'ARRAY_ADD',
}
onMounted(() => {
  // 用来标记for...in循环
  const ITERATE_KEY = Symbol('ownKeys');
  // 用来标志proxy代理对象的原对象的访问属性
  const RAW_KEY = Symbol('raw');
  let activeEffect: any = null;
  const bubble = new WeakMap();
  const effectStack: any[] = [];
  const effect = (fn: any) => {
    const effectFn = () => {
      activeEffect = effectFn;
      effectStack.push(effectFn);
      const res = fn();
      effectStack.pop();
      activeEffect = last(effectStack) || undefined;
      return res;
    };
    effectFn();
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
  const trigger = (target: Record<string | symbol, any>, key: string | symbol, type: TriggerType) => {
    if (!bubble.has(target))
      return;
    const keySet = bubble.get(target)?.get(key);
    const runningSet: Set<any> = new Set();
    keySet && keySet.forEach((fn: any) => {
      if (activeEffect !== fn) {
        runningSet.add(fn);
      }
    });
    // 如果触发类型是数组,且ARRAY_ADD,则需要将length属性对应的副作用函数集合取出来重新执行
    if (Array.isArray(target) && type === TriggerType.ARRAY_ADD) {
      const lengthEffectFnSet = bubble.get(target)?.get('length');
      lengthEffectFnSet && lengthEffectFnSet.forEach((fn: any) => {
        if (activeEffect !== fn) {
          runningSet.add(fn);
        }
      });
    }
    // 如果触发类型是数组,且触发的key是length,则需要将index>=length的元素对应的副作用函数集合取出来重新执行
    if (Array.isArray(target) && key === 'length') {
      bubble.get(target).forEach((effects: any, index: number) => {
        if (index >= target[key]) {
          effects && effects.forEach((fn: any) => {
            if (activeEffect !== fn) {
              runningSet.add(fn);
            }
          });
        }
      });
    }
    // 只有当属性新增 || 删除时,才会触发for...in对应的副作用函数
    if ([TriggerType.ADD, TriggerType.DELETE].includes(type)) {
      // 获得ITERATE_KEY对应的副作用函数集合,也就是for...in循环的副作用函数集合
      const forInEffectFnSet = bubble.get(target)?.get(ITERATE_KEY);
      forInEffectFnSet && forInEffectFnSet.forEach((fn: any) => {
        if (activeEffect !== fn) {
          runningSet.add(fn);
        }
      });
    }
    runningSet && runningSet.forEach((fn: any) => {
      fn();
    });
  };
  // 封装成一个reactive函数
  /**
   *
   * @param obj 要封装的对象
   * @param isShallow 是否是浅响应
   * @param isReadonly 是否只读
   */
  function createReactive(obj: any, isShallow: boolean = false, isReadonly: boolean = false) {
    return new Proxy(obj, {
    // 赋值操作
      set(target, key, value, receiver) {
        // 设置只读属性
        if (isReadonly) {
          console.warn('要修改的属性是只读的');
          return true;
        }
        // 如果设置的值和原来的值相同,则不应该触发副作用函数(同时需要考虑NaN !== NaN的情况)
        if (target[key] === value || (Number.isNaN(target[key]) && Number.isNaN(value))) {
          return true;
        }
        // 判断当前操作的对象是否是数组,然后判断当前操作的key(index)是否已经超出了数组的长度,如果超出了,就说明是新增,
        // length长度也需要改变,否则就是简单的设置值.
        // 如果当前操作的对象不是数组,那么判断当前操作的属性是否存在,如果属性不存在,则说明是在添加新属性,否则是设置已有属性
        const type = Array.isArray(target)
          ? Number(key) < target.length ? TriggerType.ARRAY_SET : TriggerType.ARRAY_ADD
          : Object.prototype.hasOwnProperty.call(target, key) ? TriggerType.SET : TriggerType.ADD;
        Reflect.set(target, key, value, receiver);
        // 原型也会触发副作用函数的解决办法:通过receiver来判断当前target是否是receiver的代理对象,如果不是,则不触发trigger
        if (receiver[RAW_KEY] !== target) {
          return true;
        }
        trigger(target, key, type);
        return true;
      },
      // 赋值操作: 拦截delete操作
      deleteProperty(target, key) {
        Reflect.deleteProperty(target, key);
        // 由于删除属性时,也会触发for..in循环,所以我们要多传入一个type,用来区分是删除属性还是新增属性
        trigger(target, key, TriggerType.DELETE);
        return true;
      },
      // 读取操作
      get(target, key, receiver) {
        // 通过RAW_KEY来获取代理对象的原对象
        if (key === RAW_KEY) {
          return target;
        }
        // 如果是只读的,则不需要为其建立响应
        if (!isReadonly)
          track(target, key);
        // 在这里实现深响应
        const res = Reflect.get(target, key, receiver);
        if (typeof res === 'object' && res !== null && !isShallow) {
          // 如果是只读的,则内部的对象也应该是只读的
          if (isReadonly)
            return readonly(res);
          return reactive(res);
        }
        return Reflect.get(target, key, receiver);
      },
      // 读取操作: 拦截 key in obj 操作
      has(target, key) {
        track(target, key);
        return Reflect.has(target, key);
      },
      // 读取操作: 拦截for...in循环
      ownKeys(target) {
      // 由于for...in循环只能拿到对象target,所以对于for...in循环,我们用一个Symbol = ITERATE_KEY来标记
        track(target, ITERATE_KEY);
        return Reflect.ownKeys(target);
      },
    });
  }
  // reactive 深响应
  function reactive(obj: any) {
    return createReactive(obj);
  }
  // shallowReactive 浅响应
  function shallowReactive(obj: any) {
    return createReactive(obj, true);
  }
  // 只读属性
  function readonly(obj: any) {
    return createReactive(obj, false, true);
  }
  // 浅只读属性
  function shallowReadonly(obj: any) {
    return createReactive(obj, true, true);
  }
  // const arr = reactive([0]);
  // effect(() => {
  //   console.log(arr.length);
  // });
  // setTimeout(() => {
  //   arr[1] = 1;
  // }, 1000);

  const arr2 = reactive([0, 1, 2, 3, 4, 5]);
  effect(() => {
    console.log(arr2[5]);
  });
  setTimeout(() => {
    arr2.length = 5;
  }, 1000);
});
</script>

<template>
  <div>
    <p id="text" />
    <p id="num" />
  </div>
</template>

<style scoped lang="scss"></style>
