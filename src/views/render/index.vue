<script setup lang="ts">
import createRenderer from './render';

declare const VueReactivity: {
  effect: (...args: any) => any
  ref: (...args: any) => { value: any }
};

onMounted(() => {
  const { effect, ref } = VueReactivity;
  const renderer = createRenderer();
});
</script>

<template>
  <div id="app" />
</template>

<style scoped lang="scss"></style>
