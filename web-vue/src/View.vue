<script lang="ts" setup>
import DisplayBoard from "./Display/DisplayBoard.vue";
import { useDisplay } from 'vuetify'
import Explorer from "./Explorer/Explorer.vue";
import { ref } from "vue";
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
    });
})
const drawer = ref(true)
const selectedFSO = computed(() => {
  const filePath = router.currentRoute.value.query.file as string
  if (filePath) {
    const found = root.value.find(filePath)
    console.log(found)
    return found
  } else {
    return null
  }
})
const selectedFile = computed(() => selectedFSO.value instanceof FileInfo ? selectedFSO.value : undefined)
const selectedDir = computed(() => selectedFSO.value instanceof DirectoryInfo ? selectedFSO.value : undefined)
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
      <Explorer :root="root" @select-file="onSelecteFile"></Explorer>
    </v-navigation-drawer>
    <v-main style="height:100vh;">
      <DisplayBoard :file="selectedFile">
        <template #app-bar-pre v-if="breakpoint">
          <v-app-bar-nav-icon @click="drawer = !drawer" />
        </template>
      </DisplayBoard>
    </v-main>
  </v-layout>
</template>
<style scoped></style>
