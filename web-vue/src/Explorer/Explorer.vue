<script lang="ts" setup>
import { ref, onUpdated, watch } from "vue";
import { DirectoryInfo, FileInfo } from "../FileTree";
import Directory from "./Directory.vue";
import File from "./File.vue";
import DirectoryView, { SearchDelegate } from "./DirectoryView.vue";
import { computed } from "@vue/reactivity";
const props = defineProps<{
  root: DirectoryInfo;
}>();
const emit = defineEmits<{
  (e: "selectFile", file: FileInfo): void
}>()
const curDir = ref<DirectoryInfo>(props.root)
const search = ref()
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
const address = computed(() => {
  let addres = ""
  if (!curDir.value) return addres
  let cur: DirectoryInfo | undefined = curDir.value
  while (cur) {
    if (cur.parent === undefined) {
      addres += "/"
    } else {
      addres += cur.name
    }
    cur = cur.parent
  }
  return addres
})
const searchDelegate = computed<SearchDelegate | undefined>(() => {
  if (search.value) {
    return (file) => {
      return file.name.toLocaleLowerCase().includes(search.value.toLocaleLowerCase())
    }
  }
  return
})

</script>
<template>
  <v-layout>
    <v-app-bar prominent>
      <template v-if="curDir?.parent">
        <v-app-bar-nav-icon @click="onNaviBack" icon="mdi-arrow-left" />
      </template>
      <template v-else>
        <v-app-bar-nav-icon disabled icon="mdi-home" />
      </template>
      <v-app-bar-title>
        {{ curDir?.name }}
      </v-app-bar-title>
      <v-spacer></v-spacer>
      <v-text-field v-model="search" label="Search" append-inner-icon="mdi-magnify" single-line hide-details />
      <v-menu open-on-hover>
        <template v-slot:activator="{ props }">
          <v-btn variant="text" icon="mdi-filter" v-bind="props" />
        </template>
        <v-list>
          <v-list-item key="a">
            aa
          </v-list-item>
        </v-list>
      </v-menu>
      <v-btn variant="text" icon="mdi-dots-vertical" />
    </v-app-bar>
    <v-main style="height:100vh;overflow-y:auto;">
      <template v-if="curDir">
        <DirectoryView @click-dir="onDirClick" :dir="curDir" @click-file="emit('selectFile', $event)"
          :search-delegate="searchDelegate" />
      </template>
    </v-main>
  </v-layout>
</template>