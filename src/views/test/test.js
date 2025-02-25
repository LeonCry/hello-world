const obj = {
  foo: 1,
  bar: 2,
};
const p = new Proxy(obj, {
  get(target, key, receiver) {
    return Reflect.get(target, key, receiver);
  },
  set(target, key, value, receiver) {
    Reflect.set(target, key, value, receiver);
    return true;
  },
  deleteProperty(target, key) {
    return Reflect.deleteProperty(target, key);
  },
});
delete p.bar;
console.log(p); // { foo: 1 }
console.log(obj); // { foo: 1 }
