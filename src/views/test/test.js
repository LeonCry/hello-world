const p = {
  get a() {
    console.log(1);
    return 1;
  },
  set a(value) {
    console.log(value);
  },
};
const ax = Object.create(p);
ax.a = 10;
console.log(ax.a);
