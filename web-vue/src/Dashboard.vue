<script lang="ts" setup>
import DisplayBoard from "./Display/DisplayBoard.vue";
import ConnectDialog from "./ConnectDialog.vue";
import Explorer from "./Explorer/Explorer.vue";
import { ref } from "vue";
import { FileInfo, parseFileTree } from "./FileTree";
const tree = ref();
// for testing
fetch("http://localhost:81/list", { method: "GET" })
  .then((res) => res.json())
  .then((data) => {
    const fileTree = parseFileTree("http://localhost:81/file",data)
    tree.value = fileTree;
  });
const drawer = ref(true)
const selectedFile = ref<FileInfo>()
function onSelecteFile(file: FileInfo) {
  console.log(file)
  selectedFile.value = file
}
</script>

<template>
  <v-layout>
    <v-navigation-drawer v-model="drawer" permanent style="width: 50%;">
      <Explorer :root="tree" @select-file="onSelecteFile"></Explorer>
    </v-navigation-drawer>
    <v-main style="width: 50%;">
      <DisplayBoard :file="selectedFile" />
    </v-main>
  </v-layout>
</template>
<style scoped></style>
