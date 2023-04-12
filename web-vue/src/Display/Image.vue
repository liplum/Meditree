<script lang="ts" setup>
import { FileInfo } from '../FileTree';

const props = defineProps<{
  file: FileInfo
}>();
</script>

<template>
  <v-img :src="props.file.url" :alt="props.file.name" />
</template>