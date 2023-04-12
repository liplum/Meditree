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
    <v-app-bar prominent></v-app-bar>
    <v-main>
      <template v-if="props.file">
        <component :is="renderer" :file="props.file"></component>
      </template>
    </v-main>
  </v-layout>
</template>