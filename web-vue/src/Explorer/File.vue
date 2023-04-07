<script lang="ts" setup>
import { File } from "../FileTree";
defineProps<{
  file: File;
  name: string;
}>();
</script>

<template>
  <v-card class="mx-auto" width="400">
    <v-icon icon="mdi-file"></v-icon>
  </v-card>
</template>
