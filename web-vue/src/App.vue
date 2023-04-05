<script setup>
import Dashboard from "./Dashboard.vue";
import Connect from "./Connect.vue";
import { ref } from "vue";

const fileTree = ref(null);
</script>

<template>
  <template v-if="fileTree">
    <Dashboard></Dashboard>
  </template>
  <template v-else>
    <Connect></Connect>
  </template>
</template>
<style scoped>
.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;
}
.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}
.logo.vue:hover {
  filter: drop-shadow(0 0 2em #42b883aa);
}
</style>
