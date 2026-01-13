<template>
  <div id="app">
    <Sidebar v-if="isLoggedIn" :collapsed="isCollapsed" @toggle-sidebar="toggleSidebar" />

    <div class="main" :class="{
      withSidebar: isLoggedIn && isDesktop,
      collapsed: isLoggedIn && isDesktop && isCollapsed,
    }">
      <Navbar v-if="isLoggedIn" :collapsed="isCollapsed && isDesktop" @toggle-sidebar="toggleSidebar" />

      <div class="view-container" :class="{ 'no-chrome': !isLoggedIn }">
        <router-view />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from "vue";
import Sidebar from "./components/Sidebar.vue";
import Navbar from "./components/Navbar.vue";
import { useAuth } from "./stores/auth";

const { isLoggedIn, syncFromStorage } = useAuth();

const isCollapsed = ref(false);
const isMobile = ref(false);
const isDesktop = ref(true);
let mq;

function updateViewportFlags() {
  const mobile = mq.matches;
  isMobile.value = mobile;
  isDesktop.value = !mobile;
  applyScrollLock();
}

function toggleSidebar() {
  isCollapsed.value = !isCollapsed.value;
  applyScrollLock();
}

function lockBody(lock) {
  document.documentElement.style.overflow = lock ? "hidden" : "";
  document.body.style.overflow = lock ? "hidden" : "";
}
function applyScrollLock() {
  lockBody(isLoggedIn.value && isMobile.value && isCollapsed.value);
}

onMounted(() => {
  // ✅ sync once on app load
  syncFromStorage();

  mq = window.matchMedia("(max-width: 768px)");
  updateViewportFlags();
  mq.addEventListener?.("change", updateViewportFlags);

  // multi-tab sync
  window.addEventListener("storage", syncFromStorage);
});

onBeforeUnmount(() => {
  mq?.removeEventListener?.("change", updateViewportFlags);
  window.removeEventListener("storage", syncFromStorage);
});

watch(isLoggedIn, () => {
  // when logged out, reset UI
  if (!isLoggedIn.value) {
    isCollapsed.value = false;
    lockBody(false);
  }
});
</script>

<style scoped>
#app {
  display: flex;
  height: 100vh;
  position: relative;
  width: 100%;
  overflow-x: hidden;
  /* ✅ stop global horizontal scroll */
}

/* IMPORTANT: allow flex child to shrink */
.main {
  flex: 1;
  min-width: 0;
  /* ✅ key fix for flex overflow */
  display: flex;
  flex-direction: column;
  margin-left: 0;
  transition: margin-left 0.3s;
}

.view-container {
  margin-top: 0;
  flex: 1;
  min-width: 0;
  /* ✅ prevents children from forcing width */
  overflow: auto;
  overflow-x: hidden;
  /* ✅ no horizontal scroll in content area */
  background: var(--main-bg-color);
  padding: 20px;
}


/* ✅ Logged in desktop width */
.main.withSidebar {
  margin-left: 15%;
}

/* ✅ Collapsed desktop rail */
.main.withSidebar.collapsed {
  margin-left: 5%;
}

.view-container:not(.no-chrome) {
  margin-top: 60px;
}

.view-container.no-chrome {
  padding: 0;
}

@media (max-width: 768px) {
  .main {
    margin-left: 0 !important;
  }
}
</style>
