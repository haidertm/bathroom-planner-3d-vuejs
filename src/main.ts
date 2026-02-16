import { createApp } from "vue";
import "./style.css";
import App from "./App.vue";
import router from "./router";
import { initGTM } from "./plugins/gtm";
import { initPostHog } from "./plugins/posthog";

const app = createApp(App);
app.use(router);

// ---------------------------------------------------------------------------
// Lazy-load analytics on first real user interaction.
// A single set of 32 event listeners triggers both GTM and PostHog.
// No idle-callback or timeout fallback — bots / Lighthouse never fire these.
// ---------------------------------------------------------------------------

const windowEvents = new Set(["scroll", "resize", "orientationchange"]);

const interactionEvents = [
  "click",
  "dblclick",
  "mousedown",
  "mouseup",
  "mousemove",
  "mouseenter",
  "mouseleave",
  "mouseover",
  "mouseout",
  "wheel",
  "keydown",
  "keyup",
  "keypress",
  "touchstart",
  "touchend",
  "touchmove",
  "touchcancel",
  "pointerdown",
  "pointerup",
  "pointermove",
  "pointerenter",
  "pointerleave",
  "pointerover",
  "pointerout",
  "focus",
  "blur",
  "scroll",
  "resize",
  "orientationchange",
  "contextmenu",
  "submit",
  "input",
] as const;

let analyticsLoaded = false;

function loadAnalytics() {
  if (analyticsLoaded) return;
  analyticsLoaded = true;

  // Remove all remaining listeners
  for (const event of interactionEvents) {
    const target: EventTarget = windowEvents.has(event) ? window : document;
    target.removeEventListener(event, loadAnalytics, true);
  }

  initGTM(app, router);
  initPostHog(app);
}

const listenerOptions: AddEventListenerOptions = {
  passive: true,
  once: true,
  capture: true,
};

for (const event of interactionEvents) {
  const target: EventTarget = windowEvents.has(event) ? window : document;
  target.addEventListener(event, loadAnalytics, listenerOptions);
}

app.mount("#app");