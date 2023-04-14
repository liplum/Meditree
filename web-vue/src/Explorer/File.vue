<script lang="ts" setup>
import { FileInfo } from "../FileTree";
const props = defineProps<{
  file: FileInfo;
}>();
function resolveIcon(type: string): string {
  if (type.startsWith("image")) return "mdi-image"
  if (type.startsWith("video")) return "mdi-video"
  if (type.startsWith("audio")) return "mdi-music"
  if (type.startsWith("text")) {
    if (type.endsWith("html")) return "mdi-text-long"
    return "mdi-text"
  }
  return "mdi-file"
}
</script>

<template>
  <v-card class="mx-auto file-card">
    <v-row class="row-center">
      <v-icon size="64" :icon="resolveIcon(props.file.type)" />
      <span>{{ props.file.name }}</span>
    </v-row>
  </v-card>
</template>

<style scoped>
.file-card {
  width: 8rem;
  padding: 1rem;
}

.row-center {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100%;
}
</style>