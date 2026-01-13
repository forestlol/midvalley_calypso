import { createRouter, createWebHistory } from "vue-router";
import Dashboard from "./views/Dashboard.vue";
import Login from "./views/Login.vue";
import Tenants from "./views/Tenants.vue";
import Gateways from "./views/Gateways.vue";
import GasConsumption from "./views/GasConsumption.vue";
import Summary from "./views/Summary.vue";
import Alarms from "./views/Alarms.vue";
import { useAuth } from "./stores/auth";

const routes = [
  {
    path: "/",
    name: "Dashboard",
    component: Dashboard,
    meta: { requiresAuth: true },
  },
  {
    path: "/tenants",
    name: "Tenants",
    component: Tenants,
    meta: { requiresAuth: true },
  },
  {
    path: "/gateways",
    name: "Gateways",
    component: Gateways,
    meta: { requiresAuth: true },
  },
  {
    path: "/gas",
    name: "GasConsumption",
    component: GasConsumption,
    meta: { requiresAuth: true },
  },
  {
    path: "/summary",
    name: "Summary",
    component: Summary,
    meta: { requiresAuth: true },
  },
  {
    path: "/alarms",
    name: "Alarms",
    component: Alarms,
    meta: { requiresAuth: true },
  },

  { path: "/login", name: "Login", component: Login },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to) => {
  const { isLoggedIn, syncFromStorage } = useAuth();
  syncFromStorage();

  if (to.meta?.requiresAuth && !isLoggedIn.value) return { name: "Login" };
  if (to.name === "Login" && isLoggedIn.value) return { name: "Dashboard" };

  return true;
});

export default router;
