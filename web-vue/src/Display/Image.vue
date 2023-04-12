<script setup>
const props = defineProps(["src,alt"]);
</script>

<template>
  <v-img  :src="props.src" :alt="props.alt" />
</template>