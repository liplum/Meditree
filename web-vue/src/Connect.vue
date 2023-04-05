<script setup>
import { ref } from "vue";

const server = ref("");
const serverRules = [(value) => checkServer(value)];
async function submit(event) {
  const results = await event;
  alert(JSON.stringify(results, null, 2));
}
async function checkServer(server) {
  if (!server) return "Please enter a server.";
  return true;
}
</script>
<template>
  <div class="dialog">
    <v-sheet width="300" class="mx-auto">
      <h2 class="title">Connect to server</h2>
      <v-form validate-on="submit" @submit.prevent="submit">
        <v-text-field
          v-model="server"
          :rules="serverRules"
          label="Server"
        ></v-text-field>

        <div class="text-end">
          <v-btn class="text-none" rounded type="submit" block>Connect</v-btn>
        </div>
      </v-form>
    </v-sheet>
  </div>
</template>

<style scoped>
.title {
  margin: 1rem;
}
.dialog {
  display: flex;
  place-items: center;
  min-height: 100vh;
}
</style>