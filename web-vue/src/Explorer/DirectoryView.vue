<script setup lang="ts">
import { onUpdated } from "vue"
import { DirectoryInfo, FileInfo } from "../FileTree";
import File from "./File.vue"
import Directory from "./Directory.vue"
const props = defineProps<{
  dir: DirectoryInfo;
}>();
onUpdated(() => {
  console.log("DirectoryView", props.dir)
})
const emit = defineEmits<{
  (e: "onFileClick", file: FileInfo): void
  (e: "onDirClick", file: DirectoryInfo): void
}>()
</script>

<template>
  <v-container fluid>
    <v-row>
      <v-col v-for="(file, name, index) in props.dir.files" :key="name" cols="4">
        <template v-if="(file instanceof FileInfo)">
          <File @click="emit('onFileClick', file)" :file="file" />
        </template>
        <template v-else>
          <Directory @click="emit('onDirClick', file)" :dir="file" />
        </template>
      </v-col>
    </v-row>
  </v-container>
</template>