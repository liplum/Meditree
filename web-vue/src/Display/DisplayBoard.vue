<script lang="ts" setup>
import { computed } from "@vue/reactivity";
import { FileInfo } from "../FileTree";
import { resolveRenderer } from "./DisplayBoard";
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
</script>

<template>
  <v-layout>
    <v-app-bar prominent>
      <slot name="app-bar-pre"></slot>
      <v-app-bar-title>
        {{ props.file?.name }}
      </v-app-bar-title>
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