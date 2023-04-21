<script lang="ts" setup>
import DisplayBoard from "./Display/DisplayBoard.vue";
import { useDisplay } from 'vuetify'
import Explorer from "./Explorer/Explorer.vue";
import { ref, watch } from "vue";
import { DirectoryInfo, FileInfo, parseFileTree } from "./FileTree";
import { useRouter } from "vue-router"
import { computed } from "@vue/reactivity";
import { onMounted } from "vue";
const router = useRouter()
function createRoot(): DirectoryInfo {
  const dir = new DirectoryInfo()
  dir.path = "/"
  dir.name = "Root"
  return dir
}
const root = ref(createRoot())
// for testing
onMounted(() => {
  fetch(`/list`, { method: "GET" })
    .then((res) => res.json())
    .then((data) => {
      const fileTree = parseFileTree(`/file`, data)
      root.value = fileTree
      selectedDir.value = fileTree
    });
})
const drawer = ref(true)
const selectedFile = computed(() => {
  const filePath = router.currentRoute.value.query.file as string
  if (filePath) {
    const found = root.value.find(filePath)
    return found instanceof FileInfo ? found : null
  }
  return null
})
const selectedDir = ref(root.value)
watch(selectedFile, (value, old) => {
  if (value instanceof FileInfo && value.parent) {
    selectedDir.value = value.parent
  } else {
    selectedDir.value = root.value
  }
})
function onSelecteFile(file: FileInfo) {
  router.push({
    path: "/view",
    query: {
      file: file.path,
    }
  })
}
const display = useDisplay()
// for responsive drawer
const breakpoint = display.mdAndDown
</script>

<template>
  <v-layout>
    <v-navigation-drawer v-model="drawer" :clipped="breakpoint" :width="breakpoint ? 320 : 600">
      <Explorer v-model="selectedDir" @select-file="onSelecteFile"></Explorer>
    </v-navigation-drawer>
    <v-main style="height:100vh;">
      <DisplayBoard :file="selectedFile instanceof FileInfo ? selectedFile : undefined">
        <template #app-bar-pre v-if="breakpoint">
          <v-app-bar-nav-icon @click="drawer = !drawer" />
        </template>
      </DisplayBoard>
    </v-main>
  </v-layout>
</template>
<style scoped></style>
