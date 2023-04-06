<script setup>
import { useRouter, useRoute } from "vue-router";
import { ref } from "vue";
import { listUrl } from "./Backend";
import File from "./Explorer/File.vue"
const emit = defineEmits(["list"]);
const router = useRouter();
const server = ref("");
const serverRules = [(value) => checkServer(value)];
const passcode = ref("");
const showPasscode = ref(false);
const isConnecting = ref(false);
const showErrorDialog = ref(false);
async function connect(event) {
  const result = await event;
  if (!result.valid) {
    return;
  }
  isConnecting.value = true;
  try {
    const res = await fetch(listUrl(server.value, passcode.value), {
      method: "GET",
    });
    if (res.ok) {
      const payload = await res.json();
      const query = {
        server: server.value,
      };
      if (passcode.value) {
        query.passcode = passcode.value;
      }
      console.log(payload);
      router.push({
        path: "/connect",
        query,
        params: {
          fileTree: payload,
        },
      });
      emit("list", payload);
    } else {
      const payload = await res.json();
      console.log(payload);
      showErrorDialog.value = true;
    }
  } catch (error) {
    console.log(error);
    showErrorDialog.value = true;
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
      <v-card-title>
        <h2 style="text-align: center">Connect to server</h2>
      </v-card-title>
      <v-form
        validate-on="submit"
        @submit.prevent="connect"
        :disabled="isConnecting"
      >
        <v-card-text>
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
        </v-card-text>
        <v-card-actions>
          <v-btn color="primary" :disabled="isConnecting" rounded type="submit">
            Connect
          </v-btn>
        </v-card-actions>
      </v-form>
    </v-sheet>
  </div>

  <v-dialog v-model="showErrorDialog" width="auto">
    <v-card>
      <v-card-text> Failed to load. </v-card-text>
      <v-card-actions>
        <v-btn color="primary" @click="showErrorDialog = false">Close</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.dialog {
  display: flex;
  place-items: center;
  min-height: 100vh;
}
.sheet {
  border-radius: 16px;
}
</style>