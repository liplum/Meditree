<script lang="ts" setup>
import { FileInfo } from '../FileTree'
import VideoPlayer from "../Component/VideoPlayer.vue"
import { watch, reactive } from 'vue';

const props = defineProps<{
  file: FileInfo
}>()

const isMobileSafari = /iP(ad|hone|od).+Version\/[\d.]+.*Safari/i.test(navigator.userAgent)
const overrideNative = !isMobileSafari

// Create a ref to store the options
const options = reactive({
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
});

// Watch for changes in the 'file' prop and update the 'options'
watch(() => props.file, (newFile) => {
  options.sources = [{
    src: newFile.url,
    type: newFile.type,
  }]
});

</script>

<template>
  <v-responsive class="border pa-4 container">
    <div :key="props.file.url">
      <video-player :options="options" />
    </div>
  </v-responsive>
</template>
