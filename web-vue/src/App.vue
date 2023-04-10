<script setup>
import Dashboard from "./Dashboard.vue";
import ConnectDialog from "./ConnectDialog.vue";
import Explorer from "./Explorer/Explorer.vue";
import { ref } from "vue";
import { parseFileTree } from "./FileTree";
const tree = ref();
// for testing
fetch("http://localhost:81/list", { method: "GET" })
  .then((res) => res.json())
  .then((data) => {
    const fileTree = parseFileTree(data)
    tree.value = fileTree;
  });
</script>

<template>
  <Explorer :root="tree"></Explorer>
</template>
<style scoped></style>
