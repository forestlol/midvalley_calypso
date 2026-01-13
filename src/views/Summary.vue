<template>
    <div v-if="store.loading">Loading…</div>
    <div v-else-if="store.error" class="err">Error: {{ store.error }}</div>

    <div v-else class="wrap">
        <div class="card">
            <div class="title">Summary (All Tenants)</div>
            <div class="actions">
                <button class="btn" @click="window.print()">Print</button>
                <button class="btn" @click="exportCsv">Export CSV</button>
            </div>
            <div class="hint">Yesterday + cumulative are computed from synthetic daily gas totals.</div>
        </div>

        <div class="card">
            <table class="table">
                <thead>
                    <tr>
                        <th>Tenant</th>
                        <th>Yesterday (m³)</th>
                        <th>Cumulative (m³)</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="r in summaryRows" :key="r.tenant">
                        <td>{{ r.tenant }}</td>
                        <td>{{ r.yesterday }}</td>
                        <td>{{ r.cumulative }}</td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</template>

<script setup>
import { computed, onMounted } from "vue";
import { useSiteStore } from "../stores/siteStore";
import { exportToCsv } from "../utils/exportCsv";
import { dateRange, getYesterday, syntheticGasDaily } from "../utils/agg";

const store = useSiteStore();
onMounted(() => store.load());

const yday = getYesterday();

const cumulativeDays = computed(() => {
    const start = store.meta?.start_date || "2025-11-01";
    const endMeta = store.meta?.end_date || "2025-12-31";
    const end = yday < endMeta ? yday : endMeta;
    return dateRange(start, end);
});

const summaryRows = computed(() => {
    const tenants = store.tenants || [];
    const gasMeters = store.gasMeters || [];

    const yMap = new Map();
    const cMap = new Map();
    for (const t of tenants) { yMap.set(t, 0); cMap.set(t, 0); }

    for (const m of gasMeters) {
        // yesterday
        yMap.set(m.tenant, (yMap.get(m.tenant) || 0) + syntheticGasDaily(m.meter_id, yday));
        // cumulative
        for (const d of cumulativeDays.value) {
            cMap.set(m.tenant, (cMap.get(m.tenant) || 0) + syntheticGasDaily(m.meter_id, d));
        }
    }

    return tenants
        .map(t => ({
            tenant: t,
            yesterday: Math.round((yMap.get(t) || 0) * 10) / 10,
            cumulative: Math.round((cMap.get(t) || 0) * 10) / 10,
        }))
        .sort((a, b) => b.cumulative - a.cumulative);
});

function exportCsv() {
    exportToCsv(`summary_${yday}.csv`, summaryRows.value);
}
</script>

<style scoped>
.wrap {
    display: grid;
    gap: 16px;
}

.card {
    background: #fff;
    border: 1px solid #e1e4ea;
    border-radius: 12px;
    padding: 14px;
}

.title {
    font-weight: 800;
    color: #2f3542;
    margin-bottom: 10px;
}

.actions {
    display: flex;
    gap: 10px;
    justify-content: flex-end;
}

.btn {
    border: 1px solid #e1e4ea;
    background: #f5f7fa;
    padding: 10px 12px;
    border-radius: 10px;
    cursor: pointer;
}

.hint {
    font-size: 12px;
    color: #8a94a6;
    margin-top: 8px;
}

.table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
}

th,
td {
    padding: 8px;
    border-bottom: 1px solid #edf0f5;
    text-align: left;
    color: #2f3542;
}

.err {
    color: #e55353;
}
</style>
