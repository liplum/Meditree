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
    });
})
const drawer = ref(true)
const selectedFSO = computed(() => {
  const filePath = router.currentRoute.value.query.file as string
  if (filePath) {
    return root.value.find(filePath)
  } else {
    return null
  }
})
const selectedDir = ref()
watch(selectedFSO, (fso, oldFso) => {
  console.log("fso", fso)
  console.log("oldFso", oldFso)
  if (fso instanceof FileInfo) {
    if (fso.parent) {
      selectedDir.value = fso.parent
    } else {
      selectedDir.value = root.value
    }
  } else if (fso instanceof DirectoryInfo) {
    selectedDir.value = fso
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
      <Explorer :root="root" v-model="selectedDir" @select-file="onSelecteFile"></Explorer>
    </v-navigation-drawer>
    <v-main style="height:100vh;">
      <DisplayBoard :file="selectedFSO instanceof FileInfo ? selectedFSO : undefined">
        <template #app-bar-pre v-if="breakpoint">
          <v-app-bar-nav-icon @click="drawer = !drawer" />
        </template>
      </DisplayBoard>
    </v-main>
  </v-layout>
</template>
<style scoped></style>
