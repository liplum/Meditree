<script lang="ts" setup>
import { FileInfo } from "../FileTree";
const props = defineProps<{
  file: FileInfo;
}>();
</script>

<template>
  <v-card class="mx-auto file-card">
    <v-row class="row-center">
      <v-icon size="64" icon="mdi-file" />
      <v-card-text>
        {{ props.file.name }}
      </v-card-text>
    </v-row>
  </v-card>
</template>

<style scoped>
.file-card {
  width: 8rem;
  padding: 1rem;
}

.row-center {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100%;
}
</style>