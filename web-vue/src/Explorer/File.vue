<script lang="ts" setup>
import { FileInfo } from "../FileTree";
const props = defineProps<{
  file: FileInfo;
}>();
</script>

<template>
  <v-card class="mx-auto" width="400">
    <v-icon icon="mdi-file"></v-icon>
    <v-card-text>
      {{ props.file.name }}
    </v-card-text>
  </v-card>
</template>
