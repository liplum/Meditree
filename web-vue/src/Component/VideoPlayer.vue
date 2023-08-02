<script setup lang="ts">
import videojs from 'video.js'
import Player from 'video.js/dist/types/player';
import 'video.js/dist/video-js.css'
import { onBeforeMount, onMounted, ref, Ref } from 'vue';

const props = defineProps({
  options: Object
})

const player: Ref<Player | null> = ref(null)
const videoPlayer: Ref<HTMLVideoElement | null> = ref(null);

onMounted(() => {
  player.value = videojs(videoPlayer.value!, props.options, () => {
    player.value?.log('onPlayerReady', player.value)
  })
})

onBeforeMount(() => {
  if (player.value) {
    player.value.dispose()
  }
})

</script>

<template>
  <video ref="videoPlayer" class="video-js vjs-fluid"></video>
</template>
