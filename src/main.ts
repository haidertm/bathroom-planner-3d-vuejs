import { createApp } from "vue";
import "./style.css";
import App from "./App.vue";
import router from "./router";
import { setupGTM } from "./plugins/gtm";
import { setupPostHog } from "./plugins/posthog";

const app = createApp(App);
app.use(router);

// Initialize Google Tag Manager with lazy loading
// GTM will load after user interaction or during browser idle time
// This ensures zero impact on initial page load and 3D rendering performance
setupGTM(app, router);

// Initialize PostHog product analytics and error tracking
setupPostHog(app);

app.mount("#app");