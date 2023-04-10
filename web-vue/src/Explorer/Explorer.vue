<script lang="ts" setup>
import { ref } from "vue";
import { DirectoryInfo, FileInfo } from "../FileTree";
import Directory from "./Directory.vue";
import File from "./File.vue";
import DirectoryView from "./DirectoryView.vue";
const props = defineProps<{
  root: DirectoryInfo;
}>();
const curDir = ref<DirectoryInfo>(props.root)
</script>
<template>
  <v-layout>
    <v-app-bar color="primary" prominent>
      <v-app-bar-nav-icon variant="text"></v-app-bar-nav-icon>

      <v-toolbar-title>My files</v-toolbar-title>

      <v-spacer></v-spacer>

      <v-btn variant="text" icon="mdi-magnify"></v-btn>

      <v-btn variant="text" icon="mdi-filter"></v-btn>

      <v-btn variant="text" icon="mdi-dots-vertical"></v-btn>
    </v-app-bar>
    <DirectoryView :dir="curDir" />
  </v-layout>
</template>