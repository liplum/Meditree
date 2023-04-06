<script setup>
import { useRouter, useRoute } from "vue-router";
const fileTree = defineProps(["fileTree"]);
const route = useRoute();
const data = route.params;
console.log(data);
</script>

<template></template>