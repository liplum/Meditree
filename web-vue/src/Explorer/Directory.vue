<script lang="ts" setup>
import { DirectoryInfo } from "../FileTree";
defineProps<{
  dir: DirectoryInfo;
  name: string;
}>();
</script>

<template>
  <v-card class="mx-auto" width="400">
    <v-icon icon="mdi-folder"></v-icon>
  </v-card>
</template>