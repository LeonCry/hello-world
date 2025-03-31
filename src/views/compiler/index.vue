<script setup lang="ts">
import { tokenize } from './compiler';

const template = '<div><p>Vue</p><p>Template</p></div>';
const result = tokenize(template);
console.log(result);
</script>

<template>
  <div />
</template>

<style scoped lang="scss"></style>
