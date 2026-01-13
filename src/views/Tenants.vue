<template>
    <div class="tenants-page">
        <!-- PAGE HEADER -->
        <div class="page-header">
            <div>
                <h1>Tenants</h1>
                <p>Manage tenant list used across the dashboard</p>
            </div>
        </div>

        <!-- ADD TENANT -->
        <div class="card">
            <div class="card-title">Add Tenant</div>

            <div class="add-row">
                <input v-model="newTenant" class="input" placeholder="e.g. KIOSK_ABC" />
                <button class="btn primary" @click="addTenant">
                    Add Tenant
                </button>
            </div>

            <div class="hint">
                This will not modify the dataset file. Changes are stored locally.
            </div>
        </div>

        <!-- TENANT LIST -->
        <div class="card">
            <div class="card-title">
                Tenant List
                <span class="count">{{ store.tenants.length }}</span>
            </div>

            <table class="table">
                <thead>
                    <tr>
                        <th>Tenant Name</th>
                        <th class="right">Action</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="t in store.tenants" :key="t">
                        <td>{{ t }}</td>
                        <td class="right">
                            <button class="btn danger" @click="store.removeTenant(t)">
                                Remove
                            </button>
                        </td>
                    </tr>

                    <tr v-if="store.tenants.length === 0">
                        <td colspan="2" class="empty">
                            No tenants found
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useSiteStore } from "../stores/siteStore";

const store = useSiteStore();
const newTenant = ref("");

onMounted(() => {
    store.load();
});

function addTenant() {
    if (!newTenant.value.trim()) return;
    store.addTenant(newTenant.value);
    newTenant.value = "";
}
</script>

<style scoped>
/* ===== PAGE BACKGROUND ===== */
.tenants-page {
    min-height: 100%;
    padding: 24px;
}

/* ===== HEADER ===== */
.page-header {
    color: #000;
    margin-bottom: 24px;
}

.page-header h1 {
    font-size: 28px;
    font-weight: 800;
    margin: 0;
}

.page-header p {
    font-size: 14px;
    opacity: 0.9;
    margin-top: 4px;
}

/* ===== CARD ===== */
.card {
    background: #ffffff;
    border-radius: 14px;
    padding: 18px;
    margin-bottom: 18px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.12);
}

.card-title {
    font-size: 16px;
    font-weight: 800;
    color: #0a1f44;
    margin-bottom: 12px;
    display: flex;
    align-items: center;
    gap: 8px;
}

.count {
    background: #1976d2;
    color: #ffffff;
    font-size: 12px;
    padding: 2px 8px;
    border-radius: 999px;
}

/* ===== ADD ROW ===== */
.add-row {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
}

.input {
    flex: 1;
    border: 1px solid #d6dbe6;
    border-radius: 10px;
    padding: 10px 12px;
    font-size: 14px;
}

.input:focus {
    outline: none;
    border-color: #1976d2;
}

/* ===== BUTTONS ===== */
.btn {
    border: none;
    border-radius: 10px;
    padding: 10px 14px;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
}

.btn.primary {
    background: #1976d2;
    color: #ffffff;
}

.btn.primary:hover {
    background: #1565c0;
}

.btn.danger {
    background: rgba(229, 83, 83, 0.12);
    color: #e55353;
}

.btn.danger:hover {
    background: rgba(229, 83, 83, 0.2);
}

/* ===== HINT ===== */
.hint {
    margin-top: 8px;
    font-size: 12px;
    color: #6b7280;
}

/* ===== TABLE ===== */
.table {
    width: 100%;
    border-collapse: collapse;
    font-size: 14px;
}

th {
    text-align: left;
    padding: 10px;
    font-size: 12px;
    color: #6b7280;
    border-bottom: 1px solid #e5e9f2;
}

td {
    padding: 10px;
    border-bottom: 1px solid #eef1f7;
    color: #0a1f44;
}

.right {
    text-align: right;
}

.empty {
    text-align: center;
    padding: 20px;
    color: #6b7280;
}

/* ===== PRINT ===== */
@media print {
    .tenants-page {
        background: #ffffff;
        padding: 0;
    }

    .btn {
        display: none;
    }

    .card {
        box-shadow: none;
        border: 1px solid #ddd;
    }
}
</style>
