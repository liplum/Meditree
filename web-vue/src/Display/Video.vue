<script lang="ts" setup>
import { FileInfo } from '../FileTree';

const props = defineProps<{
  file: FileInfo
}>();
</script>

<template>
  <video controls :src="props.file.url" :alt="props.file.name" />
</template>