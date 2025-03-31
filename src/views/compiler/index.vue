<script setup lang="ts">
import { ASTBuilder, tokenize } from './compiler';

const template = '<div><p>Vue</p><p>Template</p></div>';
const resToken = tokenize(template);
const resAST = ASTBuilder(resToken);
console.log(resToken);
console.log(resAST);
</script>

<template>
  <div />
</template>

<style scoped lang="scss"></style>
