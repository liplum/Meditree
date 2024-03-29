<script lang="ts" setup>
import { ref } from "vue";
import Cookies from "js-cookie"
import { useRouter } from "vue-router"
import { useI18n } from "vue-i18n"
import { storage } from "./Env";
const router = useRouter()
const { t } = useI18n({ inheritLocale: true })
const account = ref("")
const password = ref("")
const showPassword = ref(false)
const isLogingIn = ref(false)
const showErrorDialog = ref(false)

const errorCause = ref("")

async function login(event) {
  const result = await event;
  if (!result.valid) {
    return;
  }
  if (!account.value) {
    // if no account is posted, assume password is not required.
    router.push("/view")
  }
  isLogingIn.value = true
  try {
    const loginRes = await fetch("/api/login", {
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
      const lastPath = storage.lastFilePathFromUrl
      if (lastPath) {
        router.push(`/view?file=${encodeURIComponent(lastPath)}`)
      } else {
        router.push("/view")
      }
    } else {
      const cause = await loginRes.text()
      throw new Error(cause)
    }
  } catch (error) {
    console.error(error)
    errorCause.value = error.message
    showErrorDialog.value = true
  } finally {
    isLogingIn.value = false
  }
}

</script>
<template>
  <div class="dialog">
    <v-sheet rounded width="450" class="mx-auto sheet">
      <v-card-title>
        <h2 style="text-align: center">
          {{ t("login.title") }}
        </h2>
      </v-card-title>
      <v-form validate-on="submit" @submit.prevent="login" :loading="isLogingIn">
        <v-card-text>
          <v-text-field v-model="account" :label="t('login.account')"></v-text-field>
          <v-text-field v-model="password" :append-icon="showPassword ? 'mdi-eye' : 'mdi-eye-off'"
            :type="showPassword ? 'text' : 'password'" :label="t('login.password')"
            @click:append="showPassword = !showPassword"></v-text-field>
        </v-card-text>
        <v-card-actions>
          <v-btn color="primary" :disabled="isLogingIn" rounded type="submit">
            {{ t("login.loginBtn") }}
          </v-btn>
        </v-card-actions>
      </v-form>
    </v-sheet>
  </div>

  <v-dialog v-model="showErrorDialog" width="auto">
    <v-card>
      <v-card-text>{{ t("login.failed") }}</v-card-text>
      <v-card-actions>
        <v-btn color="primary" @click="showErrorDialog = false">
          {{ t("login.closeBtn") }}
        </v-btn>
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