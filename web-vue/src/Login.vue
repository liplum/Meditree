<script lang="ts" setup>
import { ref } from "vue";
import Cookies from "js-cookie"
import { useRouter } from "vue-router";
const router = useRouter()
const account = ref("");
const password = ref("");
const showPassword = ref(false);
const isLogingIn = ref(false);
const showErrorDialog = ref(false);

async function login(event) {
  const result = await event;
  if (!result.valid) {
    return;
  }
  isLogingIn.value = true;
  try {
    const loginRes = await fetch("/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        account: account.value,
        password: password.value,
      })
    })
    if (loginRes.ok) {
      const { jwt } = await loginRes.json()
      Cookies.set("jwt", jwt)
      router.push("/view")
    } else {
      throw new Error(await loginRes.text())
    }
  } catch (error) {
    console.error(error);
    showErrorDialog.value = true;
  } finally {
    isLogingIn.value = false;
  }
}
</script>
<template>
  <div class="dialog">
    <v-sheet rounded width="450" class="mx-auto sheet">
      <v-card-title>
        <h2 style="text-align: center">Connect to server</h2>
      </v-card-title>
      <v-form validate-on="submit" @submit.prevent="login" :loading="isLogingIn">
        <v-card-text>
          <v-text-field v-model="account" label="Account"></v-text-field>

          <v-text-field v-model="password" :append-icon="showPassword ? 'mdi-eye' : 'mdi-eye-off'"
            :type="showPassword ? 'text' : 'password'" label="Password"
            @click:append="showPassword = !showPassword"></v-text-field>
        </v-card-text>
        <v-card-actions>
          <v-btn color="primary" :disabled="isLogingIn" rounded type="submit">
            Connect
          </v-btn>
        </v-card-actions>
      </v-form>
    </v-sheet>
  </div>

  <v-dialog v-model="showErrorDialog" width="auto">
    <v-card>
      <v-card-text>Failed to Login.</v-card-text>
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