// @lint-ignore-atd app bootstrap: mounts the Vue app and registers the asset-caching service worker; no business rule

import { createApp } from 'vue'
import { registerSW } from 'virtual:pwa-register'

import App from './App.vue'
import './styles/index.css'

registerSW({ immediate: true })

createApp(App).mount('#app')
