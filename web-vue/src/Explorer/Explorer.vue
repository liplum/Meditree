<script lang="ts" setup>
export interface File {
  "*type": string;
  "*hide"?: boolean;
  path: string;
  size: string;
}
export interface Directory {
  "*hide"?: boolean;
  [name: string]: File | Directory | any;
}
defineProps<{
  tree: Directory;
}>();
</script>

<template></template>