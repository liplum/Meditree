<script setup lang="ts">
import { DirectoryInfo, FileInfo } from "../FileTree";
import File from "./File.vue"
import Directory from "./Directory.vue"
import { computed } from "@vue/reactivity";
export type SearchDelegate = (file: FileInfo | DirectoryInfo) => boolean
export type ViewMode = "list" | "grid"
export interface Props {
  dir: DirectoryInfo
  searchDelegate?: SearchDelegate
  view?: ViewMode
}
const props = withDefaults(defineProps<Props>(), {
  view: "grid",
})
const files = computed(() => {
  if (props.searchDelegate) {
    const filtered = new Map<string, FileInfo | DirectoryInfo>()
    for (const [name, file] of props.dir.files) {
      if (props.searchDelegate(file)) {
        filtered.set(name, file)
      }
    }
    return filtered
  } else {
    return props.dir.files
  }
})
const emit = defineEmits<{
  (e: "clickFile", file: FileInfo): void
  (e: "clickDir", file: DirectoryInfo): void
}>()
</script>

<template>
  <template v-if="props.view === 'grid'">
    <v-container fluid>
      <v-row no-gutters align-self="stretch">
        <v-col v-for="[name, file] in files" :key="name" cols="auto" style="width: 8rem;">
          <template v-bind="props" v-if="(file instanceof FileInfo)">
            <File @click="emit('clickFile', file)" :file="file" />
          </template>
          <template v-else>
            <Directory @click="emit('clickDir', file)" :dir="file" />
          </template>
        </v-col>
      </v-row>
    </v-container>
  </template>
  <template v-else>
  </template>
</template>
