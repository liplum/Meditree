<script lang="ts" setup>
import { ref } from "vue";
import { DirectoryInfo, FileInfo } from "../FileTree";
import Directory from "./Directory.vue";
import File from "./File.vue";
const props = defineProps<{
  curDir: DirectoryInfo;
}>();
const isHidden = props.curDir["*hide"] === true
const files: Record<string, FileInfo | DirectoryInfo> = props.curDir
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
    <ul>
      <li v-for="(file, name, index) in files">
        <template v-if="file['*type'] !== undefined">
          <File :name="name" :file="file as FileInfo" />
        </template>
        <template v-else>
          <Directory :name="name" :dir="file" />
        </template>
      </li>
    </ul>
  </v-layout>
</template>