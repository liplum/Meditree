<script lang="ts" setup>
import { ref, onUpdated, watch } from "vue";
import { DirectoryInfo, FileInfo } from "../FileTree";
import Directory from "./Directory.vue";
import File from "./File.vue";
import DirectoryView from "./DirectoryView.vue";
const props = defineProps<{
  root: DirectoryInfo;
}>();

const curDir = ref<DirectoryInfo>(props.root)
watch(() => props.root, (value, old) => {
  curDir.value = value
})
function onDirClick(dir: DirectoryInfo) {
  curDir.value = dir
}
function onNaviBack() {
  const parent = curDir.value.parent
  if (parent) {
    curDir.value = parent
  }
}
</script>
<template>
  <v-layout>
    <v-app-bar color="primary" prominent>
      <template v-if="curDir.parent">
        <v-app-bar-nav-icon @click="onNaviBack" icon="mdi-arrow-left" />
      </template>
      <template v-else>
        <v-app-bar-nav-icon />
      </template>
      <v-toolbar-title>My files</v-toolbar-title>
      <v-spacer></v-spacer>
      <v-btn variant="text" icon="mdi-magnify"></v-btn>
      <v-btn variant="text" icon="mdi-filter"></v-btn>
      <v-btn variant="text" icon="mdi-dots-vertical"></v-btn>
    </v-app-bar>
    <v-main style="height:100vh;">
      <template v-if="curDir">
        <DirectoryView @click-dir="onDirClick" :dir="curDir" />
      </template>
    </v-main>
  </v-layout>
</template>