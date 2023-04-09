<script setup lang="ts">
import { DirectoryInfo } from "../FileTree";
defineProps<{
  dir: DirectoryInfo;
}>();
</script>

<template>
  <v-card class="mx-auto" width="400">
    <v-icon icon="mdi-folder"></v-icon>
  </v-card>
</template>