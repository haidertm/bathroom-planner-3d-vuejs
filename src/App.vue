<template>
  <div id="app">
    <Header
        logo="./assets/logo.svg"
        backgroundColor="#fff"
        logoHeight="45px"
    />
    <router-view />
  </div>
</template>

<script setup>
import Header from "./components/ui/Header.vue";
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
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

#app {
  height: 100vh;
  width: 100vw;
  overflow: hidden;
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