<script lang="ts" setup>
import { FileInfo } from '../FileTree'
import VideoPlayer from "../Component/VideoPlayer.vue"
const props = defineProps<{
  file: FileInfo
}>()
const isMobileSafari = /iP(ad|hone|od).+Version\/[\d.]+.*Safari/i.test(navigator.userAgent)
const overrideNative = !isMobileSafari
const videoOptions = {
  controls: true,
  responsive: true,
  liveui: true,
  html5: {
    vhs: {
      overrideNative
    }
  },
  nativeVideoTracks: !overrideNative,
  nativeAudioTracks: !overrideNative,
  nativeTextTracks: !overrideNative,
  playbackRates: [0.1, 0.5, 1, 1.5, 2, 3, 5, 10],
  sources: [{
    src: props.file.url,
    type: props.file.type,
  }],
}
</script>

<template>
  <v-responsive class="border pa-4 container">
    <video-player :options="videoOptions" />
  </v-responsive>
</template>

<style scoped>
.container {
  /* adjust the height as needed */
  height: 100%;
  width: 100%;
}
</style>