<script lang="ts" setup>
import { FileObject } from "../FileTree";
import { truncateString } from "../Utils"
const p = defineProps<{
  file: FileObject;
}>();
function resolveIcon(type: string): string {
  if (type.startsWith("image")) return "mdi-image"
  if (type.startsWith("video")) return "mdi-video"
  if (type.startsWith("audio")) return "mdi-music"
  if (type.startsWith("text")) {
    if (type.endsWith("html")) return "mdi-text-long"
    return "mdi-text"
  }
  if (type === "application/x-mpegURL") return "mdi-folder-play"
  return "mdi-file"
}
</script>

<template>
  <v-card class="mx-auto file-card">
    <div class="row-center">
      <v-icon size="4rem" :icon="resolveIcon(p.file.type)" />
      <v-tooltip bottom>
        <template v-slot:activator="{ props }">
          <span v-bind="props" style="text-align: center;font-size: small;">
            {{ truncateString(p.file.name, 32) }}
          </span>
        </template>
        <p>{{ p.file.path }}</p>
      </v-tooltip>
    </div>
  </v-card>
</template>

<style scoped>
.file-card {
  padding: 1rem;
  height: 100%;
}

.row-center {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}
</style>