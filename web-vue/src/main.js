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
import { StarChart } from './StarChart'

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
        // try to verify the jwt, or the backend doesn't require jwt.
        const validationRes = await fetch("/verify")
        if (validationRes.ok) {
          next("/view")
        } else {
          Cookies.remove("jwt")
          next()
        }
      }
    },
    { path: '/view', component: View },
  ], // short for `routes: routes`
})

app.use(router)

const i18n = createI18n({
  globalInjection: true,
  legacy: false, // you must set `false`, to use Composition API
  fallbackLocale: 'en', // set fallback locale
  silentFallbackWarn: true,
  warnHtmlInMessage: "off",
  messages: l10nChart, // set locale messages
})

app.use(i18n)

const starChart = new StarChart()
starChart.load()

app.provide("star-chart", starChart)

app.mount('#app')