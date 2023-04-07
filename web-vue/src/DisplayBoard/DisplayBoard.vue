<script setup>
import { resolveRenderer } from "./DisplayBoard";
const props = defineProps(["file"]);
const renderer = resolveRenderer(props.file["*type"]);
</script>

<template>
  <component :is="renderer"></component>
</template>