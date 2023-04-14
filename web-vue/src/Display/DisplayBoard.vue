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
    </v-app-bar>
    <v-main>
      <template v-if="props.file">
        <div class="image-container">
          <v-responsive aspect-ratio="1" class="border pa-4">
            <component :is="renderer" :file="props.file"></component>
          </v-responsive>
        </div>
      </template>
    </v-main>
  </v-layout>
</template>

<style>
.image-container {
  height: calc(100vh - 128px); /* adjust the height as needed */
  overflow-y: auto;
}
</style>