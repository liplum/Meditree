<script lang="ts" setup>
import DisplayBoard from "./Display/DisplayBoard.vue";
import ConnectDialog from "./ConnectDialog.vue";
import { useDisplay } from 'vuetify'
import Explorer from "./Explorer/Explorer.vue";
import { ref } from "vue";
import { FileInfo, parseFileTree } from "./FileTree";
const tree = ref();
// for testing
fetch("http://localhost:81/list", { method: "GET" })
  .then((res) => res.json())
  .then((data) => {
    const fileTree = parseFileTree("http://localhost:81/file", data)
    tree.value = fileTree;
  });
const drawer = ref(true)
const selectedFile = ref<FileInfo>()
function onSelecteFile(file: FileInfo) {
  console.log(file)
  selectedFile.value = file
}
const display = useDisplay()
// for responsive drawer
const mdAndDown = display.mdAndDown
</script>

<template>
  <v-layout>
    <v-navigation-drawer v-model="drawer" :clipped="mdAndDown" :width="mdAndDown ? 400 : 600">
      <Explorer :root="tree" @select-file="onSelecteFile"></Explorer>
    </v-navigation-drawer>
    <v-main>
      <DisplayBoard :file="selectedFile" />
    </v-main>
  </v-layout>
</template>
<style scoped></style>
