<script setup lang="ts">
import { DirectoryInfo } from "../FileTree";
const props = defineProps<{
  dir: DirectoryInfo;
}>();
</script>

<template>
  <v-card class="mx-auto" width="100" height="100">
    <v-row class="row-center">
      <v-icon size="64" icon="mdi-folder" />
      <span>My Text</span>
    </v-row>
  </v-card>
</template>

<style scoped>
.row-center {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100%;
}
</style>