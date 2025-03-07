const a = [0, 1, 2, 3, 4];
a[8] = 8;
console.log(a);
a.forEach((e, i) => {
  console.log(e, i);
});
