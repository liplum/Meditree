<script setup>
import Dashboard from "./Dashboard.vue";
import ConnectDialog from "./ConnectDialog.vue";
import { ref } from "vue";

const fileTree = ref(null);

function onFetchList(list) {
  fileTree.value = list;
}
</script>

<template>
  <Dashboard></Dashboard>
</template>
<style scoped>
</style>
