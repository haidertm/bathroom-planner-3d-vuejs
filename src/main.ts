import { createApp } from "vue";
import "./style.css";
import App from "./App.vue";
import router from "./router";
import { initGTM } from "./plugins/gtm";
import { initOpenReplay } from "./plugins/openreplay";

const app = createApp(App);
app.use(router);

// ---------------------------------------------------------------------------
// Lazy-load analytics on first real user interaction.
// A single set of event listeners triggers both GTM and OpenReplay.
// No idle-callback or timeout fallback — bots / Lighthouse never fire these.
// ---------------------------------------------------------------------------

const interactionEvents = [
  "mousedown",
  "mousemove",
  "mouseup",
  "mouseenter",
  "click",
  "wheel",
  "touchstart",
  "touchmove",
  "touchend",
  "touchcancel",
  "keydown",
  "keypress",
  "keyup",
  "scroll",
  "pointerdown",
  "pointermove",
  "pointerup",
  "pointercancel",
  "resize",
  "focus",
  "blur",
  "contextmenu",
  "mouseleave",
  "mouseover",
  "mouseout",
  "dblclick",
  "dragstart",
  "drop",
  "input",
  "change",
  "submit",
  "orientationchange",
] as const;

const windowEvents = new Set(["scroll", "resize", "orientationchange"]);

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

  initGTM(app, router);
  initOpenReplay(app, router);
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
