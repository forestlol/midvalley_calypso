// src/stores/auth.js
import { ref, computed } from "vue";

const isLoggedIn = ref(localStorage.getItem("isLoggedIn") === "true");

// user object: { username, role, siteId, tenantName }
const user = ref(null);

function safeLoadUser() {
  const raw = localStorage.getItem("user");
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    // if old value was string username, convert it
    return {
      username: raw,
      role: "normal_user",
      siteId: null,
      tenantName: null,
    };
  }
}

// init user on load
user.value = safeLoadUser();

function setLoggedIn(payload) {
  // payload can be string username or object
  const obj =
    typeof payload === "string"
      ? {
          username: payload,
          role: "normal_user",
          siteId: null,
          tenantName: null,
        }
      : payload;

  localStorage.setItem("isLoggedIn", "true");
  localStorage.setItem("user", JSON.stringify(obj));

  isLoggedIn.value = true;
  user.value = obj;
}

async function logoutAndClear() {
  try {
    localStorage.clear();
    sessionStorage.clear();

    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }

    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
  } catch (e) {
    console.warn("Logout cleanup failed:", e);
  } finally {
    isLoggedIn.value = false;
    user.value = null;
  }
}

function syncFromStorage() {
  isLoggedIn.value = localStorage.getItem("isLoggedIn") === "true";
  user.value = safeLoadUser();
}

// ✅ role helpers (so Dashboard/Sidebar can use them)
const userRole = computed(() => user.value?.role || "normal_user");
const siteId = computed(() => user.value?.siteId || null);
const tenantName = computed(() => user.value?.tenantName || null);

export function useAuth() {
  return {
    isLoggedIn: computed(() => isLoggedIn.value),
    user: computed(() => user.value),

    // new fields
    userRole,
    siteId,
    tenantName,

    setLoggedIn,
    logoutAndClear,
    syncFromStorage,
  };
}
