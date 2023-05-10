<script lang="ts" setup>
import { FileInfo } from '../FileTree'

const props = defineProps<{
  file: FileInfo
}>()
</script>

<template>
  <v-responsive class="border pa-4 container">
    <audio controls :src="props.file.url" :alt="props.file.name" />
  </v-responsive>
</template>

<style scoped>
.container {
  /* adjust the height as needed */
  height: calc(100vh - 128px);
  width: 100%;
}
</style>