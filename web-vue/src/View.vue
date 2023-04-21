<script lang="ts" setup>
import DisplayBoard from "./Display/DisplayBoard.vue";
import { useDisplay } from 'vuetify'
import Explorer from "./Explorer/Explorer.vue";
import { ref } from "vue";
import { DirectoryInfo, FileInfo, parseFileTree } from "./FileTree";
function createRoot(): DirectoryInfo {
  const dir = new DirectoryInfo()
  dir.path = "/"
  dir.name = "Root"
  return dir
}
const root = ref(createRoot())
// for testing
fetch(`/list`, { method: "GET" })
  .then((res) => res.json())
  .then((data) => {
    const fileTree = parseFileTree(`/file`, data)
    root.value = fileTree
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
    <v-navigation-drawer v-model="drawer" :clipped="breakpoint" :width="breakpoint ? 320 : 600">
      <Explorer :root="root" @select-file="onSelecteFile"></Explorer>
    </v-navigation-drawer>
    <v-main style="height:100vh;">
      <DisplayBoard :file="selectedFile">
        <template #app-bar-pre v-if="breakpoint">
          <v-app-bar-nav-icon @click="drawer = !drawer" />
        </template>
      </DisplayBoard>
    </v-main>
  </v-layout>
</template>
<style scoped></style>