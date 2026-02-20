import { createApp } from "vue";
import "./style.css";
import App from "./App.vue";
import router from "./router";

const app = createApp(App);
app.use(router);

// ---------------------------------------------------------------------------
// Lazy-load analytics on first real user interaction.
// A single set of event listeners triggers both GTM and OpenReplay.
// No idle-callback or timeout fallback — bots / Lighthouse never fire these.
// ---------------------------------------------------------------------------

const interactionEvents = [
  "click",
  "touchstart",
  "scroll",
  "keydown",
] as const;

const windowEvents = new Set(["scroll"]);

let analyticsLoaded = false;
let eventListeners: {
  target: Window | Document;
  event: string;
  handler: () => void;
}[] = [];

function loadAnalytics() {
  if (analyticsLoaded) return;
  analyticsLoaded = true;

  // Remove all remaining event listeners
  eventListeners.forEach(({ target, event, handler }) => {
    target.removeEventListener(event, handler);
  });
  eventListeners = [];

  // Dynamic imports so the analytics chunk is only fetched on first interaction
  import("./plugins/gtm").then(({ initGTM }) => initGTM(app, router));
  import("./plugins/openreplay").then(({ initOpenReplay }) => initOpenReplay(app, router));
}

// Skip GTM on admin pages
const { href } = window.location;
if (href.includes("vueAdmin") || href.includes("vueadmin")) {
  // Don't register any analytics listeners on admin pages
} else {
  interactionEvents.forEach((event) => {
    const target = windowEvents.has(event) ? window : document;
    try {
      target.addEventListener(event, loadAnalytics, {
        passive: true,
        once: true,
      });
      eventListeners.push({ target, event, handler: loadAnalytics });
    } catch {
      // Silently handle
    }
  });
}

app.mount("#app");
