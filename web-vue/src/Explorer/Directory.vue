<script setup lang="ts">
import { DirectoryObject } from "../FileTree"
import { truncateString } from "../Utils"
const p = defineProps<{
  dir: DirectoryObject
}>()
</script>

<template>
  <v-card class="mx-auto dir-card">
    <div class="row-center">
      <v-icon size="4rem" icon="mdi-folder" />
      <v-tooltip bottom>
        <template v-slot:activator="{ props }">
          <span v-bind="props" style="text-align: center;font-size: small;">
            {{ truncateString(p.dir.name, 24) }}
          </span>
        </template>
        <p>{{ p.dir.path }}</p>
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