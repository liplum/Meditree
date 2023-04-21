<script setup lang="ts">
import { computed } from "@vue/reactivity";
import { DirectoryInfo } from "../FileTree";
import { truncateString } from "../Utils"
const props = defineProps<{
  dir: DirectoryInfo;
}>();
const dir = computed(() => props.dir)
</script>
<template>
  <v-card class="mx-auto dir-card">
    <div class="row-center">
      <v-icon size="4rem" icon="mdi-folder" />
      <v-tooltip bottom>
        <template v-slot:activator="{ props }">
          <span v-bind="props" style="text-align: center;">{{ truncateString(dir.name, 16) }}</span>
        </template>
        <p>{{ dir.path }}</p>
      </v-tooltip>
    </div>
  </v-card>
</template>

<style scoped>
.dir-card {
  padding: 1rem;
  height: 100%;
}

.row-center {
  display: flex;
  flex-direction: column;
  padding: 1rem;
  justify-content: center;
  align-items: center;
}
</style>