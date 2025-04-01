<script setup lang="ts">
import { ASTBuilder, generate, tokenize, transform } from './compiler';

const template = '<div><p>Vue</p><p>Template</p></div>';
const resToken = tokenize(template);
console.log('生成的tokens:', resToken);
const resAST = ASTBuilder(resToken);
console.log('生成的AST:', JSON.parse(JSON.stringify(resAST)));
const jsAST = transform(resAST);
console.log('生成的jsAST:', jsAST);
const code = generate(jsAST);
console.log('生成的code:', code);
</script>

<template>
  <div />
</template>
