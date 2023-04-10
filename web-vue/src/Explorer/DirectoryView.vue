<script setup lang="ts">
import { DirectoryInfo, FileInfo } from "../FileTree";
import File from "./File.vue"
import Directory from "./Directory.vue"
const props = defineProps<{
  dir: DirectoryInfo;
}>();
const emit = defineEmits<{
  (e: "onFileClick", file: FileInfo): void
  (e: "onDirClick", file: DirectoryInfo): void
}>()

</script>

<template>
  <ul>
    <li v-for="(file, name, index) in props.dir.files">
      <template v-if="file instanceof FileInfo">
        <File @click="emit('onFileClick', file)" :file="file" />
      </template>
      <template v-else>
        <Directory @click="emit('onDirClick', file)" :dir="file" />
      </template>
    </li>
  </ul>
</template>