<script setup lang="ts">
import { DirectoryObject, FileObject } from "../FileTree";
import File from "./File.vue"
import Directory from "./Directory.vue"
import { computed } from "@vue/reactivity";
export type SearchDelegate = (file: FileObject | DirectoryObject) => boolean
export type ViewMode = "list" | "grid"
export interface Props {
  dir: DirectoryObject
  searchDelegate?: SearchDelegate
  view?: ViewMode
}
const props = withDefaults(defineProps<Props>(), {
  view: "grid",
})
const files = computed(() => {
  if (!props.searchDelegate) return props.dir.files

  const filtered = new Map<string, FileObject | DirectoryObject>()
  for (const [name, file] of props.dir.files) {
    if (props.searchDelegate(file)) {
      filtered.set(name, file)
    }
  }
  return filtered
})
const emit = defineEmits<{
  (e: "clickFile", file: FileObject): void
  (e: "clickDir", file: DirectoryObject): void
}>()
</script>

<template>
  <template v-if="props.view === 'grid'">
    <v-container fluid>
      <v-row no-gutters align-self="stretch">
        <v-col v-for="[name, file] in files" :key="name" cols="auto" style="width: 8rem;">
          <template v-bind="props" v-if="(file instanceof FileObject)">
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
