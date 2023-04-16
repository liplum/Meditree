<script setup lang="ts">
import { onUpdated } from "vue"
import { DirectoryInfo, FileInfo } from "../FileTree";
import File from "./File.vue"
import Directory from "./Directory.vue"
import { computed } from "@vue/reactivity";
export type SearchDelegate = (file: FileInfo | DirectoryInfo) => boolean
export type ViewMode = "list" | "grid"
export interface Props {
  dir: DirectoryInfo;
  searchDelegate?: SearchDelegate;
  view?: ViewMode;
}
const props = withDefaults(defineProps<Props>(), {
  view: "grid",
});
onUpdated(() => {
  console.log("DirectoryView", props.dir)
})
const files = computed(() => {
  if (props.searchDelegate) {
    return props.dir.files.filter(props.searchDelegate)
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
        <v-col v-for="(file, name, index) in files" :key="name" cols="auto" style="width: 8rem;">
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
  <template v-else>

  </template>
</template>
