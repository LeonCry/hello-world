class Complex {
  #r = 0;
  #i = 0;
  constructor(r, i) {
    this.#r = r;
    this.#i = i;
  }
}

const c = new Complex(1, 2);
console.log(c.r);
