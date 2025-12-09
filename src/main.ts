import { createApp } from "vue";
import "./style.css";
import App from "./App.vue";
import router from "./router";
import { setupGTM } from "./plugins/gtm";
import { setupOpenReplay } from "./plugins/openreplay";

const app = createApp(App);
app.use(router);

// Initialize Google Tag Manager with lazy loading
// GTM will load after user interaction or during browser idle time
// This ensures zero impact on initial page load and 3D rendering performance
setupGTM(app, router);

// Initialize OpenReplay with lazy loading
// OpenReplay will load after user interaction or during browser idle time
// This ensures zero impact on initial page load and 3D rendering performance
setupOpenReplay(app, router);

app.mount("#app");
