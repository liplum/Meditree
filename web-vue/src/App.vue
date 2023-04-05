<script setup>
import Dashboard from "./Dashboard.vue";
import Connect from "./Connect.vue";
import { ref } from "vue";

const fileTree = ref(null);

function onFetchList(list) {
  fileTree.value = list;
}
</script>

<template>
  <router-view> </router-view>
</template>
<style scoped>
</style>
