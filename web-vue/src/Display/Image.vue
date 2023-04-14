<script lang="ts" setup>
import { FileInfo } from '../FileTree';

const props = defineProps<{
  file: FileInfo
}>();
</script>

<template>
  <v-img :src="props.file.url" :alt="props.file.name">
    <template #placeholder>
      <div class="d-flex align-center justify-center fill-height">
        <v-progress-circular color="grey-lighten-4" indeterminate></v-progress-circular>
      </div>
    </template></v-img>
</template>