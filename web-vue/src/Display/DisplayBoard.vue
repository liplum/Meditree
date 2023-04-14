<script lang="ts" setup>
import { computed } from "@vue/reactivity";
import { FileInfo } from "../FileTree";
import ImageRenderer from "./Image.vue"
import { filesize } from "filesize"

function resolveRenderer(type: string) {
  if (!type) return null
  if (type.startsWith("image")) {
    return ImageRenderer
  }
  return null
}

const props = defineProps<{
  file?: FileInfo;
}>();
const renderer = computed(() => {
  if (props.file) {
    return resolveRenderer(props.file.type);
  } else {
    return null
  }
})
const size = computed(() => {
  if (props.file) {
    return filesize(props.file.size, { base: 2, standard: "jedec" }) as string
  }
})
</script>

<template>
  <v-layout>
    <v-app-bar prominent>
      <slot name="app-bar-pre"></slot>
      <v-app-bar-title>
        {{ props.file?.name }}
      </v-app-bar-title>
      <template #append>
        <v-chip v-if="size">
          {{ size }}
        </v-chip>
      </template>
    </v-app-bar>
    <v-main>
      <div v-if="props.file" class="board">
        <v-responsive aspect-ratio="1" class="border pa-4">
          <component :is="renderer" :file="props.file"></component>
        </v-responsive>
      </div>
    </v-main>
  </v-layout>
</template>

<style>
.board {
  height: calc(100vh - 128px);
  /* adjust the height as needed */
  overflow-y: auto;
}
</style>