<script setup>
import Dashboard from "./Dashboard.vue";
import ConnectDialog from "./ConnectDialog.vue";
import Explorer from "./Explorer/Explorer.vue";
import { ref } from "vue";

const tree = ref([]);
// for testing
fetch("http://localhost:81/list", { method: "GET" })
  .then((res) => res.json())
  .then((data) => {
    tree.value = [data.files];
  });
</script>

<template>
  <Explorer :trees="tree"></Explorer>
</template>
<style scoped>
</style>
