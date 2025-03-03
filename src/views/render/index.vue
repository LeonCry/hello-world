<script setup lang="ts">
declare const VueReactivity: {
  effect: (...args: any) => any
  ref: (...args: any) => { value: any }
};
onMounted(() => {
  const { effect, ref } = VueReactivity;
  function render(domString: string, container: Element | null) {
    if (container === null)
      return;
    container.innerHTML = domString;
  }
  const count = ref(1);
  effect(() => {
    render(`<h1>${count.value}</h1>`, document.getElementById('app'));
  });
});
</script>

<template>
  <div id="app" />
</template>

<style scoped lang="scss"></style>
