import { createApp } from 'vue'
import './style.css'
import App from './App.vue'

// Vuetify
import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import { aliases, mdi } from 'vuetify/iconsets/mdi'
import '@mdi/font/css/materialdesignicons.css'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import ConnectDialog from './ConnectDialog.vue'
import Dashboard from './Dashboard.vue'
import { createRouter, createWebHashHistory } from "vue-router"

const app = createApp(App)

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', component: ConnectDialog },
    { path: '/connect', component: Dashboard },
  ],
})

// app.use(router)

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

app.mount('#app')
