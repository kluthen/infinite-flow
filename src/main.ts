// @lint-ignore-atd app bootstrap: registers the asset-caching service worker, loads the saved data, then mounts the Vue app with it; no business rule

import { createApp } from 'vue'
import { registerSW } from 'virtual:pwa-register'

import App from './App.vue'
import { browserSavedDataLoad, loadSavedData } from './storage-bootstrap'
import './styles/index.css'

registerSW({ immediate: true })

// The page shows only its background until the load ends; the workspace is then drawn once, with
// the loaded settings. A rejection is a defect, left unhandled.
void loadSavedData(browserSavedDataLoad()).then((savedData) => {
  createApp(App, { savedData }).mount('#app')
})
