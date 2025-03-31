<script setup lang="ts">
import { ASTBuilder, tokenize, transform } from './compiler';

const template = '<div><p>Vue</p><p>Template</p></div>';
const resToken = tokenize(template);
const resAST = ASTBuilder(resToken);
transform(resAST);
</script>

<template>
  <div />
</template>
