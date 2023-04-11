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
  (e: "clickFile", file: FileInfo): void
  (e: "clickDir", file: DirectoryInfo): void
}>()

</script>

<template>
  <v-container fluid>
    <v-row no-gutters align-self="stretch">
      <v-col v-for="(file, name, index) in props.dir.files" :key="name" cols="auto" >
        <template v-if="(file instanceof FileInfo)">
          <File @click="emit('clickFile', file)" :file="file" />
        </template>
        <template v-else>
          <Directory @click="emit('clickDir', file)" :dir="file" />
        </template>
      </v-col>
    </v-row>
  </v-container>
</template>
