<script lang="ts" setup>
import DisplayBoard from "./Display/DisplayBoard.vue";
import ConnectDialog from "./ConnectDialog.vue";
import { useDisplay } from 'vuetify'
import Explorer from "./Explorer/Explorer.vue";
import { ref } from "vue";
import { FileInfo, parseFileTree } from "./FileTree";
const tree = ref();
const backend = "http://localhost:81"
// for testing
fetch(`${backend}/list`, { method: "GET" })
  .then((res) => res.json())
  .then((data) => {
    const fileTree = parseFileTree(`${backend}/file`, data)
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
const breakpoint = display.mdAndDown
</script>

<template>
  <v-layout>
    <v-navigation-drawer v-model="drawer" :clipped="breakpoint" :width="breakpoint ? 300 : 600">
      <Explorer :root="tree" @select-file="onSelecteFile"></Explorer>
    </v-navigation-drawer>
    <v-main>
      <DisplayBoard :file="selectedFile">
        <template #app-bar-pre v-if="breakpoint">
          <v-app-bar-nav-icon @click="drawer = !drawer" />
        </template>
      </DisplayBoard>
    </v-main>
  </v-layout>
</template>
<style scoped></style>
