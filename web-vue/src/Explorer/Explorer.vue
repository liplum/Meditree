<script lang="ts" setup>
import { ref, watch } from "vue";
import { DirectoryInfo, FileInfo } from "../FileTree";
import { useDisplay } from 'vuetify'
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
    if (cur.isRoot) {
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
const display = useDisplay()
// for responsive drawer
const mdAndDown = display.mdAndDown
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
      <template #append>
        <v-text-field v-model="search" append-inner-icon="mdi-magnify" single-line hide-details class="search-bar" />
        <v-btn variant="text" icon="mdi-dots-vertical" />
      </template>
    </v-app-bar>
    <v-main style="overflow-y:auto;">
      <template v-if="curDir">
        <DirectoryView @click-dir="onDirClick" :dir="curDir" @click-file="emit('selectFile', $event)"
          :search-delegate="searchDelegate" />
      </template>
    </v-main>
  </v-layout>
</template>

<style scoped>
.search-bar {
  width: 3rem;
  transition: width 0.3s cubic-bezier(0, 0, 0.2, 1);
}

.search-bar:focus-within {
  width: 10rem;
}
</style>