<script setup lang="ts">
import { DirectoryInfo } from "../FileTree";
const props = defineProps<{
  dir: DirectoryInfo;
}>();
</script>

<template>
  <v-card class="mx-auto dir-card">
    <v-row class="row-center">
      <v-icon size="64" icon="mdi-folder" />
      <span>{{ props.dir.name }}</span>
    </v-row>
  </v-card>
</template>

<style scoped>
.dir-card {
  padding: 1rem;
  width: 8rem;
}

.row-center {
  display: flex;
  flex-direction: column;
  padding: 1rem;
  justify-content: center;
  align-items: center;
  height: 100%;
}
</style>