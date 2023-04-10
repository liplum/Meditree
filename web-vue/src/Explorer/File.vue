<script lang="ts" setup>
import { FileInfo } from "../FileTree";
const props = defineProps<{
  file: FileInfo;
}>();
</script>

<template>
  <v-card class="mx-auto" width="6rem" height="6rem">
    <v-row class="row-center">
      <v-icon size="64" icon="mdi-file" />
      <span>{{ props.file.name }}</span>
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