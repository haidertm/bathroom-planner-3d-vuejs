<template>
  <div id="app">
    <Header
        logo="./assets/logo.svg"
        backgroundColor="#fff"
        logoHeight="45px"
        @save-design="handleSaveDesign"
    />
    <router-view @save-design="handleSaveDesign" />
  </div>
</template>

<script setup>
import Header from "./components/ui/Header.vue";
import { useRouter } from 'vue-router'

const router = useRouter()

const handleSaveDesign = () => {
  // Emit event to the current route component
  const currentRoute = router.currentRoute.value
  if (currentRoute.name === 'Home') {
    // Trigger save design functionality
    const event = new CustomEvent('header-save-design')
    window.dispatchEvent(event)
  }
}
</script>

<style>
/* Global styles */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  height: 100%;
  overflow-x: hidden;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

#app {
  height: 100vh;
  width: 100vw;
  overflow-x: hidden;
}

/* Remove scroll bars from all elements while keeping scroll functionality */
::-webkit-scrollbar {
  display: none;
}

/* For Firefox */
* {
  scrollbar-width: none;
}

/* For Internet Explorer and Edge */
* {
  -ms-overflow-style: none;
}
</style>