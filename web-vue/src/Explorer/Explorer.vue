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
const addressBarItems = computed(() => {
  const res: any[] = []
  if (!curDir.value) return res
  let cur: DirectoryInfo | undefined = curDir.value
  while (cur) {
    if (cur.parent === undefined) {
      res.unshift({
        title: "Root",
        disabled: false,
      })
    } else {
      res.unshift({
        title: cur.name,
        disabled: false,
      })
    }
    cur = cur.parent
  }
  return res
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
    <v-main style="height:100vh;">
      <template v-if="curDir">
        <DirectoryView @click-dir="onDirClick" :dir="curDir" :search-delegate="searchDelegate" />
      </template>
    </v-main>
  </v-layout>
</template>