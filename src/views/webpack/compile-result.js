// webpack编译结果分析,以require为例
// 例如有一个入口文件:位于'./src/main.js':
// ----------------------------------------
// const a = 10;
// console.log('a:', a);
// const b = require('./b.js');
// console.log('b:', b);

// 有一个文件./src/b.js:
// ----------------------------------------
// const b = 20;
// console.log(b);
// module.exports = b;

// 那么以下是webpack的编译结果:(跳过AST)
const entry = './src/main.js';
(function compile(files) {
  // 用于module的缓存,就是当require了一个module后,将其缓存起来,下次再require时,直接从缓存中取
  const moduleCache = {};

  function __require(modulePath) {
    if (moduleCache[modulePath]) {
      return moduleCache[modulePath];
    }
    const _module = {};
    _module.exports = {};
    const me = files[modulePath];
    me(_module, _module.exports, __require);
    moduleCache[modulePath] = _module.exports;
    return _module.exports;
  }
  __require(entry);
})({
  './src/main.js': (__module, __export, __require) => {
    // webpack会将里面的代码用eval进行执行 -- 为什么?
    // 因为当使用eval时,会开辟一个新的作用域,并且可以在后面加上 //# sourceURL=./src/main.js 等用来在浏览器中调试,类似sourceMap的功能
    const a = 10;
    console.log('a:', a);
    const b = __require('./src/b.js');
    console.log('b:', b);
  },
  './src/b.js': (__module, __export, __require) => {
    const b = 20;
    console.log(b);
    __module.exports = b;
  },
});
