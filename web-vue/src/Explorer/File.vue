<script lang="ts" setup>
import { FileInfo } from "../FileTree";
defineProps<{
  file: FileInfo;
  name: string;
}>();
</script>

<template>
  <v-card class="mx-auto" width="400">
    <v-icon icon="mdi-file"></v-icon>
  </v-card>
</template>
