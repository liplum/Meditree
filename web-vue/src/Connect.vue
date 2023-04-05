<script setup>
import { ref } from "vue";
const emit = defineEmits(["list"]);

const server = ref("");
const serverRules = [(value) => checkServer(value)];
const passcode = ref("");
const showPasscode = ref(false);
const isConnecting = ref(false);
async function connect(event) {
  const result = await event;
  if (!result.valid) {
    return;
  }
  isConnecting.value = true;
  try {
    const res = await fetch(server.value, {
      method: "GET",
    });
    if (res.ok) {
      const payload = await res.json();
      emit("list", payload);
    } else {
      const payload = await res.json();
      return;
    }
  } finally {
    isConnecting.value = false;
  }
}
async function checkServer(server) {
  if (!server) return "Please enter a server.";
  return true;
}
</script>
<template>
  <div class="dialog">
    <v-sheet rounded width="450" class="mx-auto sheet">
      <h2 class="title">Connect to server</h2>
      <v-form
        validate-on="submit"
        @submit.prevent="connect"
        :disabled="isConnecting"
      >
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

        <v-btn :disabled="isConnecting" rounded type="submit" block>
          Connect
        </v-btn>
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