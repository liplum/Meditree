<script lang="ts" setup>
import { ref, onUpdated, watch } from "vue";
import { DirectoryInfo, FileInfo } from "../FileTree";
import Directory from "./Directory.vue";
import File from "./File.vue";
import DirectoryView from "./DirectoryView.vue";
import { computed } from "@vue/reactivity";
const props = defineProps<{
  root: DirectoryInfo;
}>();

const curDir = ref<DirectoryInfo>(props.root)
watch(() => props.root, (value, old) => {
  curDir.value = value
})
function onDirClick(dir: DirectoryInfo) {
  curDir.value = dir
}
function onNaviBack() {
  if (!curDir.value) return
  const parent = curDir.value.parent
  if (parent) {
    curDir.value = parent
  }
}
const addressBarItems = computed(() => {
  const res: any[] = []
  if (!curDir.value) return res
  let cur: DirectoryInfo | undefined = curDir.value
  while (cur) {
    res.push({
      title: cur.name,
      disabled: false,
    })
    cur = cur.parent
  }
  return res
})

</script>
<template>
  <v-layout>
    <v-app-bar color="primary" prominent>
      <template v-if="curDir.parent">
        <v-app-bar-nav-icon @click="onNaviBack" icon="mdi-arrow-left" />
      </template>
      <template v-else>
        <v-app-bar-nav-icon />
      </template>
      <v-breadcrumbs :items="addressBarItems">
        <template v-slot:title="{ item }">
          {{ item.title.toUpperCase() }}
        </template>
      </v-breadcrumbs>
      <v-spacer></v-spacer>
      <v-btn variant="text" icon="mdi-magnify"></v-btn>
      <v-btn variant="text" icon="mdi-filter"></v-btn>
      <v-btn variant="text" icon="mdi-dots-vertical"></v-btn>
    </v-app-bar>
    <v-main style="height:100vh;">
      <template v-if="curDir">
        <DirectoryView @click-dir="onDirClick" :dir="curDir" />
      </template>
    </v-main>
  </v-layout>
</template>