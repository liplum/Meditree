<script lang="ts" setup>
import { computed } from "@vue/reactivity"
import { FileInfo } from "../FileTree"
import ImageRenderer from "./Image.vue"
import VideoRenderer from "./Video.vue"
import AudioRenderer from "./Audio.vue"
import { filesize } from "filesize"
import { useI18n } from "vue-i18n"

const { t } = useI18n({ inheritLocale: true })

function resolveRenderer(type: string) {
  if (!type) return null
  if (type.startsWith("image")) {
    return ImageRenderer
  }
  if (type.startsWith("video")) {
    return VideoRenderer
  }
  if (type.startsWith("audio")) {
    return AudioRenderer
  }
  if (type === "application/x-mpegURL") return VideoRenderer

  return null
}

const props = defineProps<{
  file?: FileInfo
}>()
const file = computed(() => props.file)
const renderer = computed(() => {
  if (props.file) {
    return resolveRenderer(props.file.type);
  } else {
    return null
  }
})
const size = computed(() => {
  if (props.file?.size) {
    return filesize(props.file.size, { base: 2, standard: "jedec" }) as string
  }
})
</script>

<template>
  <v-app>
    <v-app-bar prominent>
      <slot name="app-bar-pre"></slot>
      <v-tooltip bottom>
        <template v-slot:activator="{ props }">
          <v-app-bar-title v-bind="props">
            {{ file?.name }}
          </v-app-bar-title>
        </template>
        <p>{{ file?.path }}</p>
      </v-tooltip>

      <template #append>
        <v-chip v-if="size">
          {{ size }}
        </v-chip>
      </template>
    </v-app-bar>
    <v-main>
      <template v-if="props.file">
        <template v-if="renderer">
          <component :is="renderer" :file="props.file"/>
        </template>
        <template v-else>
          <h1>{{ t("display.unsupportedFileType") }}</h1>
        </template>
      </template>
      <template v-else>
        <v-row justify="center">
          <v-icon size="8rem" icon="mdi-folder-off" />
        </v-row>
      </template>
    </v-main>
  </v-app>
</template>