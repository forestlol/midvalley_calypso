<template>
    <aside :class="['app-sidebar', { collapsed }]">
        <div class="logo-section">
            <img src="../assets/mid_valley_logo.png" alt="Logo" class="logo" />
        </div>

        <!-- Close button on mobile only -->
        <button class="close-btn" @click="$emit('toggle-sidebar')">&times;</button>

        <nav class="nav-content">
            <div class="menu-section">
                <span class="menu-title">MENU</span>

                <ul class="menu">
                    <!-- ✅ Everyone -->
                    <li>
                        <router-link to="/" class="menu-link" @click="onLinkClick">
                            <i class="fas fa-home"></i>
                            <span class="link-text">Homepage</span>
                        </router-link>
                    </li>

                    <!-- ✅ Everyone (tenant can see Alarms too) -->
                    <li>
                        <router-link to="/alarms" class="menu-link" @click="onLinkClick">
                            <i class="fas fa-triangle-exclamation"></i>
                            <span class="link-text">Alarms</span>
                        </router-link>
                    </li>

                    <!-- ✅ Admin roles only -->
                    <template v-if="canSeeAdminMenu">
                        <li>
                            <router-link to="/tenants" class="menu-link" @click="onLinkClick">
                                <i class="fas fa-users"></i>
                                <span class="link-text">Tenants</span>
                            </router-link>
                        </li>

                        <li>
                            <router-link to="/gateways" class="menu-link" @click="onLinkClick">
                                <i class="fas fa-network-wired"></i>
                                <span class="link-text">Gateways</span>
                            </router-link>
                        </li>

                        <li>
                            <router-link to="/gas" class="menu-link" @click="onLinkClick">
                                <i class="fas fa-chart-bar"></i>
                                <span class="link-text">Gas Consumption</span>
                            </router-link>
                        </li>

                        <li>
                            <router-link to="/summary" class="menu-link" @click="onLinkClick">
                                <i class="fas fa-table"></i>
                                <span class="link-text">Summary</span>
                            </router-link>
                        </li>
                    </template>
                </ul>
            </div>
        </nav>

        <!-- 🔴 Logout section at bottom -->
        <div class="logout-section">
            <button class="menu-link logout-btn" @click="logout">
                <i class="fas fa-sign-out-alt"></i>
                <span class="link-text">Logout</span>
            </button>
        </div>
    </aside>
</template>

<script setup>
import { computed } from "vue";
import { useAuth } from "../stores/auth";

defineProps({ collapsed: Boolean });
const emit = defineEmits(["toggle-sidebar"]);

const { userRole, syncFromStorage } = useAuth();
syncFromStorage?.();

const role = computed(() => userRole?.value || "normal_user");

const canSeeAdminMenu = computed(() =>
    role.value === "super_admin" || role.value === "site_admin"
);

const isMobile = () => window.matchMedia("(max-width: 768px)").matches;
function onLinkClick() {
    if (isMobile()) emit("toggle-sidebar");
}

async function logout() {
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
        window.location.href = "/login";
    }
}
</script>

<style scoped>
/* (same CSS as your current file — keep unchanged) */
.app-sidebar {
    position: fixed;
    top: 0;
    left: 0;
    height: 100vh;
    width: 15%;
    background: #f5f7fa;
    color: #2f3542;
    padding-top: 24px;
    border-right: 1px solid #e1e4ea;
    transition: width 0.3s, transform 0.3s;
    overflow: hidden;
    z-index: 2000;
    display: flex;
    flex-direction: column;
}

.app-sidebar.collapsed {
    width: 5%;
}

.nav-content {
    flex: 1;
}

.menu-section {
    margin-bottom: 32px;
}

.menu li {
    margin: 8px 0;
}

.menu-link {
    display: flex;
    align-items: center;
    padding: 12px 20px;
    color: inherit;
    text-decoration: none;
    border-radius: 6px;
    transition: background 0.2s;
    background: none;
    border: none;
    width: 100%;
    cursor: pointer;
}

.menu-link i {
    margin-right: 12px;
    font-size: 16px;
    color: #5f6b7a;
}

.menu-link:hover {
    background: #e9edf3;
}

.router-link-active {
    background: #e9edf3;
    border-left: 4px solid #4c7cff;
    padding-left: 16px;
}

.logo-section {
    text-align: center;
    margin-bottom: 32px;
}

.logo {
    height: 72px;
}

.menu-title {
    margin-left: 16px;
    margin-bottom: 8px;
    font-size: 11px;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: #8a94a6;
}

.link-text {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.logout-section {
    padding: 16px;
    border-top: 1px solid #e1e4ea;
}

.logout-btn {
    color: #e55353;
}

.logout-btn:hover {
    background: rgba(229, 83, 83, 0.12);
}

@media (min-width: 769px) {

    .app-sidebar.collapsed .menu-title,
    .app-sidebar.collapsed .link-text {
        display: none;
    }

    .app-sidebar.collapsed .menu-link {
        justify-content: center;
        padding: 12px 0;
    }

    .app-sidebar.collapsed .menu-link i {
        margin-right: 0;
    }

    .app-sidebar.collapsed .router-link-active {
        border-left: 0;
        padding-left: 0;
    }

    .app-sidebar.collapsed .logo {
        height: 22px;
    }
}

.close-btn {
    display: none;
}

@media (max-width: 768px) {
    .app-sidebar {
        transform: translateX(-100%);
        width: 0;
    }

    .app-sidebar.collapsed {
        transform: translateX(0);
        width: 100%;
    }

    .close-btn {
        display: block;
        position: absolute;
        top: 12px;
        right: 12px;
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: #2f3542;
    }

    .link-text,
    .menu-title {
        display: block !important;
    }
}
</style>
