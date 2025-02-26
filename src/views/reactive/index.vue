<!-- 写在前面:
  本次提交用来解决一个问题: 屏蔽原型引起的更新
  例如:
  const parent = {bar:1}
  const children = {}
  //将children的原型指向parent
  Object.setPrototypeOf(children, parent)
  effect(() => {
   console.log(child.bar) // 1
  })
  // 这个时候我们修改children.bar,会触发副作用函数2次
  children.bar = 2
  为什么会两次呢?
  首先在副作用函数里面,读取child.bar的时候会触发get,将副作用函数存到children.bar对应的set里面
  又因为children的原型指向parent,children没有bar属性,会取parent的,所有会读取parent.bar,这个时候会触发get,
  将副作用函数存到parent.bar对应的set里面
  那么在进行children.bar时修改的时候,会触发children的set拦截,触发副作用函数.
  又因为,如果设置的属性不在对象上,那么会调用原型的set拦截函数,所以会再次触发副作用函数,因此我们要屏蔽原型副作用调用
  问题:如果调用了原型的set函数,那么原型的bar值不应该也被修改了吗?
  答案:不会,因为我们是调用的children.bar = 2进行修改的,当到原型对象拦截set时,其调用的
  Reflect.set(target, key, value, receiver)中的receiver是children.所以不会修改原型的值
 -->
<script setup lang="ts">
import { last } from 'radash';

enum TriggerType {
  ADD = 'ADD',
  SET = 'SET',
  DELETE = 'DELETE',
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
  function reactive(obj: any) {
    return new Proxy(obj, {
    // 赋值操作
      set(target, key, value, receiver) {
      // 如果设置的值和原来的值相同,则不应该触发副作用函数(同时需要考虑NaN !== NaN的情况)
        if (target[key] === value || (Number.isNaN(target[key]) && Number.isNaN(value))) {
          return true;
        }
        // 如果属性不存在,则说明是在添加新属性,否则是设置已有属性
        const type = Object.prototype.hasOwnProperty.call(target, key) ? TriggerType.SET : TriggerType.ADD;
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
        track(target, key);
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
  const o1 = { bar: 1 };
  const o2 = {};
  const parent = reactive(o1);
  const children = reactive(o2);
  Object.setPrototypeOf(children, parent);
  effect(() => {
    console.log(children.bar);
  });
  children.bar = 2;
});
</script>

<template>
  <div>
    <p id="text" />
    <p id="num" />
  </div>
</template>

<style scoped lang="scss"></style>
