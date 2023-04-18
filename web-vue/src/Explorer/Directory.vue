<script setup lang="ts">
import { DirectoryInfo } from "../FileTree";
import { truncateString } from "../Utils"
const props = defineProps<{
  dir: DirectoryInfo;
}>();
</script>

<template>
  <v-card class="mx-auto dir-card">
    <div class="row-center">
      <v-icon size="4rem" icon="mdi-folder" />
      <span style="text-align: center;">{{ truncateString(props.dir.name, 16) }}</span>
    </div>
  </v-card>
</template>

<style scoped>
.dir-card {
  padding: 1rem;
  height: 100%;
}

.row-center {
  display: flex;
  flex-direction: column;
  padding: 1rem;
  justify-content: center;
  align-items: center;
}
</style>