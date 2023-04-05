<script setup>
import { ref } from "vue";

const server = ref("");
const serverRules = [(value) => checkServer(value)];
const passcode = ref("");
const showPasscode = ref(false);
async function connect(event) {
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
    <v-sheet rounded width="300" class="mx-auto sheet">
      <h2 class="title">Connect to server</h2>
      <v-form validate-on="submit" @submit.prevent="connect">
        <v-text-field
          v-model="server"
          :rules="serverRules"
          label="Server"
        ></v-text-field>

        <v-text-field
          v-model="passcode"
          :append-icon="showPasscode ? 'mdi-eye' : 'mdi-eye-off'"
          :type="showPasscode ? 'text' : 'password'"
          placeholder="Optional"
          label="Passcode"
          @click:append="showPasscode = !showPasscode"
        ></v-text-field>

        <div>
          <v-btn rounded type="submit" block>Connect</v-btn>
        </div>
      </v-form>
    </v-sheet>
  </div>
</template>

<style scoped>
.title {
  margin: 1rem;
  text-align: center;
}
.dialog {
  display: flex;
  place-items: center;
  min-height: 100vh;
}

.sheet {
  border-radius: 16px;
  padding: 1rem;
}
</style>