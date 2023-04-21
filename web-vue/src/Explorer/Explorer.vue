<script lang="ts" setup>
import { ref, watch } from "vue";
import { DirectoryInfo, FileInfo } from "../FileTree";
import DirectoryView, { SearchDelegate } from "./DirectoryView.vue";
import { computed } from "@vue/reactivity";
const props = defineProps<{
  root: DirectoryInfo;
  modelValue: DirectoryInfo;
}>();
const emit = defineEmits<{
  (e: "selectFile", file: FileInfo): void
  (e: "update:modelValue", value: DirectoryInfo): void
}>()
const search = ref()
watch(() => props.root, (value, old) => {
  emit('update:modelValue', value)
})
function onDirClick(dir: DirectoryInfo) {
  emit('update:modelValue', dir)
}
function onNaviBack() {
  const parent = props.modelValue.parent
  if (parent) {
    emit('update:modelValue', parent)
  }
}
const searchDelegate = computed<SearchDelegate | undefined>(() => {
  if (search.value) {
    return (file) => {
      return file.name.trim().toLocaleLowerCase().includes(search.value.trim().toLocaleLowerCase())
    }
  }
  return
})
</script>
<template>
  <v-app>
    <v-app-bar prominent>
      <template v-if="props.modelValue?.isRoot">
        <v-app-bar-nav-icon disabled icon="mdi-home" />
      </template>
      <template v-else>
        <v-app-bar-nav-icon @click="onNaviBack" icon="mdi-arrow-left" />
      </template>
      <v-app-bar-title>
        {{ props.modelValue?.name }}
      </v-app-bar-title>
      <v-spacer></v-spacer>
      <template #append>
        <v-text-field v-model="search" append-inner-icon="mdi-magnify" single-line hide-details class="search-bar" />
        <v-btn variant="text" icon="mdi-dots-vertical" />
      </template>
    </v-app-bar>
    <v-main style="height: 100vh;overflow-y:auto;">
      <template v-if="props.modelValue">
        <DirectoryView @click-dir="onDirClick" :dir="props.modelValue" @click-file="emit('selectFile', $event)"
          :search-delegate="searchDelegate" />
      </template>
    </v-main>
  </v-app>
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