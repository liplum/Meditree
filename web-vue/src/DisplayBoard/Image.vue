<script setup>
const props = defineProps(["src,alt"]);
</script>

<template>
  <v-img :src="src" :alt="alt" />
</template>