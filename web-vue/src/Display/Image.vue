<script lang="ts" setup>
import { FileInfo } from '../FileTree';

const props = defineProps<{
  file: FileInfo
}>();
</script>

<template>
  <v-responsive class="border pa-4 container">
    <v-img :src="props.file.url" :alt="props.file.name">
      <template #placeholder>
        <div class="d-flex align-center justify-center fill-height">
          <v-progress-circular color="grey-lighten-4" indeterminate></v-progress-circular>
        </div>
      </template></v-img>
  </v-responsive>
</template>


<style scoped>
.container {
  /* adjust the height as needed */
  height: calc(100vh - 128px);
  overflow-y: auto;
}
</style>