<script setup>
import Dashboard from "./Dashboard.vue";
import ConnectDialog from "./ConnectDialog.vue";
import Explorer from "./Explorer/Explorer.vue";
import { ref } from "vue";

const fileTree = ref(null);

</script>

<template>
  <Explorer></Explorer>
</template>
<style scoped>
</style>
