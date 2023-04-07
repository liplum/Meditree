<script lang="ts" setup>
import { Directory } from "../FileTree";
defineProps<{
  dir: Directory;
  name: string;
}>();
</script>

<template>
  <v-card class="mx-auto" width="400">
    <v-icon icon="mdi-folder"></v-icon>
  </v-card>
</template>