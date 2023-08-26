<script lang="ts" setup>
import DisplayBoard from "./Display/DisplayBoard.vue"
import { useDisplay } from 'vuetify'
import Explorer from "./Explorer/Explorer.vue"
import { ref, watch } from "vue"
import { DirectoryObject, FileObject, parseFileTree } from "./FileTree"
import { useRouter } from "vue-router"
import { computed } from "@vue/reactivity"
import { onMounted } from "vue"
import { storage } from "./Env"
const router = useRouter()
const _root = new DirectoryObject()
_root.path = "/"
_root.name = "Root"
const root = ref(_root)
// for testing
onMounted(async () => {
  const res = await fetch(`/list`)
  if (res.ok) {
    const json = await res.json()
    const fileTree = parseFileTree(json)
    root.value = fileTree
    selectedDir.value = fileTree
  } else {
    const message = await res.text()
    console.error(message)
    router.push("/")
  }
})
const drawer = ref(true)
const selectedFile = computed(() => {
  let filePath: string | null = decodeURIComponent(router.currentRoute.value.query.file as string)
  filePath = filePath === "null" || filePath === "undefined" ? null : filePath
  storage.lastFilePathFromUrl = filePath
  if (filePath) {
    const found = root.value.find(filePath)
    return found instanceof FileObject ? found : null
  }
  return null
})
const selectedDir = ref(root.value)
watch(selectedFile, (value, old) => {
  if (value instanceof FileObject && value.parent) {
    selectedDir.value = value.parent
  } else {
    selectedDir.value = root.value
  }
})
function onSelecteFile(file: FileObject) {
  router.push({
    path: "/view",
    query: {
      file: encodeURIComponent(file.path),
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
      <DisplayBoard :file="selectedFile instanceof FileObject ? selectedFile : undefined">
        <template #app-bar-pre v-if="breakpoint">
          <v-app-bar-nav-icon @click="drawer = !drawer" />
        </template>
      </DisplayBoard>
    </v-main>
  </v-layout>
</template>
<style scoped></style>
