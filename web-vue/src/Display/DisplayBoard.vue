<script lang="ts" setup>
import { computed } from "@vue/reactivity";
import { FileInfo } from "../FileTree";
import ImageRenderer from "./Image.vue"
import VideoRenderer from "./Video.vue"
import { filesize } from "filesize"

function resolveRenderer(type: string) {
  if (!type) return null
  if (type.startsWith("image")) {
    return ImageRenderer
  }
  if (type.startsWith("video")) {
    return VideoRenderer
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
      <template v-if="props.file">
        <component :is="renderer" :file="props.file"></component>
      </template>
    </v-main>
  </v-layout>
</template>