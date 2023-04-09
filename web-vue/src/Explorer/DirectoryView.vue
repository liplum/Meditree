<script setup lang="ts">
import { DirectoryInfo, FileInfo } from "../FileTree";
import File from "./File.vue"
import Directory from "./Directory.vue"
const props = defineProps<{
  dir: DirectoryInfo;
}>();
defineEmits(["onFileClick","onDirClick"])
</script>

<template>
  <ul>
    <li v-for="(file, name, index) in props.dir.files">
      <template v-if="file instanceof FileInfo">
        <File :file="file" />
      </template>
      <template v-else>
        <Directory :dir="file" />
      </template>
    </li>
  </ul>
</template>