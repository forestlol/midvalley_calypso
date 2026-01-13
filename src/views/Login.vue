<template>
    <div class="login-page">
        <div class="login-card">
            <h1 class="title">Login</h1>
            <p class="subtitle">Water Meter Dashboard</p>

            <form @submit.prevent="handleLogin">
                <div class="field">
                    <label>Username</label>
                    <input v-model="username" type="text" placeholder="Username" required />
                </div>

                <div class="field">
                    <label>Password</label>
                    <input v-model="password" type="password" placeholder="Password" required />
                </div>

                <div class="quick-hints">
                    <div class="hint-title">Test Accounts</div>
                    <div class="hint-row"><b>superadmin</b> / admin → Super Admin</div>
                    <div class="hint-row"><b>siteadmin</b> / admin → Site Admin</div>
                    <div class="hint-row"><b>user</b> / admin → Normal User (BOOKSTORE)</div>
                </div>

                <div v-if="error" class="error">{{ error }}</div>

                <button type="submit" class="login-btn">Login</button>
            </form>
        </div>
    </div>
</template>

<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useAuth } from "../stores/auth";

const router = useRouter();
const { setLoggedIn } = useAuth();

const username = ref("");
const password = ref("");
const error = ref("");

/**
 * Hardcoded accounts for now.
 * Later you can replace with backend auth.
 */
const ACCOUNTS = [
    {
        username: "superadmin",
        password: "admin",
        role: "super_admin",
        siteId: null,
        tenantName: null
    },
    {
        username: "siteadmin",
        password: "admin",
        role: "site_admin",
        siteId: "MIDVALLEY", // change later if you want
        tenantName: null
    },
    {
        username: "user",
        password: "user",
        role: "normal_user",
        siteId: "MIDVALLEY",
        tenantName: "BOOKSTORE" // assigned tenant for now
    }
];

function handleLogin() {
    const u = username.value.trim();
    const p = password.value;

    const account = ACCOUNTS.find(a => a.username === u && a.password === p);

    if (!account) {
        error.value = "Invalid username or password";
        return;
    }

    error.value = "";

    // store role + scope
    setLoggedIn({
        username: account.username,
        role: account.role,
        siteId: account.siteId,
        tenantName: account.tenantName
    });

    router.replace("/");
}
</script>

<style scoped>
/* Page background */
.login-page {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f5f7fb;
}

/* Card */
.login-card {
    width: 380px;
    padding: 32px;
    border-radius: 14px;
    background: #ffffff;
    border: 1px solid #e5e7eb;
    box-shadow: 0 12px 28px rgba(0, 0, 0, 0.08);
}

/* Text */
.title {
    margin: 0;
    text-align: center;
    font-size: 24px;
    color: #111827;
}

.subtitle {
    margin: 6px 0 16px;
    text-align: center;
    font-size: 13px;
    color: #6b7280;
}

/* Fields */
.field {
    margin-bottom: 16px;
}

label {
    font-size: 13px;
    color: #374151;
}

input {
    width: 100%;
    margin-top: 6px;
    padding: 10px 12px;
    border-radius: 10px;
    border: 1px solid #d1d5db;
    background: #ffffff;
    color: #111827;
    outline: none;
}

input:focus {
    border-color: #4f8cff;
    box-shadow: 0 0 0 1px #4f8cff;
}

/* Quick hints */
.quick-hints {
    margin: 10px 0 14px;
    padding: 12px;
    border-radius: 12px;
    border: 1px solid #e5e7eb;
    background: #f9fafb;
    font-size: 12px;
    color: #374151;
}

.hint-title {
    font-weight: 800;
    margin-bottom: 6px;
    color: #111827;
}

.hint-row {
    line-height: 1.5;
}

/* Button */
.login-btn {
    width: 100%;
    margin-top: 12px;
    padding: 12px;
    border-radius: 12px;
    border: none;
    background: #4f8cff;
    color: white;
    font-weight: 700;
    cursor: pointer;
}

.login-btn:hover {
    opacity: 0.9;
}

/* Error */
.error {
    margin-top: 8px;
    color: #dc2626;
    font-size: 13px;
    text-align: center;
}
</style>
