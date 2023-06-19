import { createApp } from 'vue'
import './style.css'
import App from './App.vue'

// Vuetify
import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import { aliases, mdi } from 'vuetify/iconsets/mdi'
import { createRouter, createWebHashHistory } from "vue-router"
import Login from "./Login.vue"
import View from "./View.vue"

import '@mdi/font/css/materialdesignicons.css'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

import { l10nChart } from "./i18n"
import { createI18n } from 'vue-i18n'
import Cookies from "js-cookie"

const app = createApp(App)

const vuetify = createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: 'dark'
  },
  icons: {
    defaultSet: 'mdi',
    aliases,
    sets: {
      mdi,
    }
  },
})

app.use(vuetify)

const router = createRouter({
  // 4. Provide the history implementation to use. We are using the hash history for simplicity here.
  history: createWebHashHistory(),
  routes: [
    {
      path: '/', component: Login, beforeEnter: async (to, from, next) => {
        const jwt = Cookies.get("jwt")
        if (!jwt) return next()
        // if jwt was generated, verify it.
        const validationRes = await fetch("/verify")
        console.log(validationRes)
        if (validationRes.ok) {
          next("/view")
        } else {
          next()
        }
      }
    },
    { path: '/view', component: View },
  ], // short for `routes: routes`
})

app.use(router)

const i18n = createI18n({
  legacy: false, // you must set `false`, to use Composition API
  fallbackLocale: 'en', // set fallback locale
  messages: l10nChart, // set locale messages
  silentFallbackWarn: true,
})

app.use(i18n)

app.mount('#app')