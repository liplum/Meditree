<script lang="ts" setup>
import { DirectoryInfo } from "../FileTree";
import Directory from "./Directory.vue";
defineProps<{
  trees?: DirectoryInfo[];
}>();
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
    <template v-for="tree in trees">
      <Directory name="aaa" :dir="tree"></Directory>
    </template>
  </v-layout>
</template>