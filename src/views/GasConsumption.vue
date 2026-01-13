<template>
    <div v-if="store.loading">Loading…</div>
    <div v-else-if="store.error" class="err">Error: {{ store.error }}</div>

    <div v-else class="wrap">
        <!-- CONTROLS -->
        <div class="card">
            <div class="title">Gas Consumption (synthetic from meter list)</div>

            <div class="controls">
                <select v-model="mode" class="input">
                    <option value="hourly">Hourly</option>
                    <option value="daily">Daily</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                </select>

                <select v-model="tenant" class="input">
                    <option value="">All Tenants</option>
                    <option v-for="t in store.tenants" :key="t" :value="t">{{ t }}</option>
                </select>

                <input v-model="startDate" type="date" class="input" />
                <input v-model="endDate" type="date" class="input" />

                <button class="btn" @click="refresh">Apply</button>
                <button class="btn" @click="printPage">Print</button>
                <button class="btn" @click="exportCsv">Export CSV</button>
            </div>
        </div>

        <!-- TOP TENANTS -->
        <div class="card">
            <div class="title">Top Tenants (total in range)</div>
            <table class="table">
                <thead>
                    <tr>
                        <th>Tenant</th>
                        <th class="num">Total m³</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="r in topTenants" :key="r.tenant">
                        <td class="text">{{ r.tenant }}</td>
                        <td class="num">{{ r.total }}</td>
                    </tr>

                    <tr v-if="topTenants.length === 0">
                        <td colspan="2" class="empty">No data</td>
                    </tr>
                </tbody>
            </table>
        </div>

        <!-- LOG TABLE -->
        <div class="card">
            <div class="title">Log Table ({{ rows.length }} rows)</div>

            <table class="table">
                <thead>
                    <tr>
                        <th>Period</th>
                        <th>Tenant</th>
                        <th class="num">m³</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="(r, idx) in pagedRows" :key="idx">
                        <td class="text">{{ r.period }}</td>
                        <td class="text">{{ r.tenant }}</td>
                        <td class="num">{{ r.m3 }}</td>
                    </tr>

                    <tr v-if="rows.length === 0">
                        <td colspan="3" class="empty">No data</td>
                    </tr>
                </tbody>
            </table>

            <!-- PAGINATION -->
            <div class="pager">
                <div class="pager-left">
                    Showing <b>{{ showingFrom }}</b>–<b>{{ showingTo }}</b> of <b>{{ rows.length }}</b>
                </div>

                <div class="pager-right">
                    <label class="pager-size">
                        Rows:
                        <select v-model.number="pageSize" class="pagerSelect">
                            <option :value="10">10</option>
                            <option :value="20">20</option>
                            <option :value="50">50</option>
                            <option :value="100">100</option>
                        </select>
                    </label>

                    <button class="pagerBtn" :disabled="currentPage === 1" @click="goFirst">«</button>
                    <button class="pagerBtn" :disabled="currentPage === 1" @click="goPrev">‹</button>

                    <span class="pagerPage">
                        Page
                        <input type="number" v-model.number="currentPage" :min="1" :max="pageCount"
                            class="pagerInput" />
                        / {{ pageCount }}
                    </span>

                    <button class="pagerBtn" :disabled="currentPage === pageCount" @click="goNext">›</button>
                    <button class="pagerBtn" :disabled="currentPage === pageCount" @click="goLast">»</button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useSiteStore } from "../stores/siteStore";
import { exportToCsv } from "../utils/exportCsv";
import { dateRange, syntheticGasDaily, syntheticGasHourlyFromDaily } from "../utils/agg";

const store = useSiteStore();

/* ----- filters ----- */
const mode = ref("daily");
const tenant = ref("");
const startDate = ref("2025-11-01");
const endDate = ref("2025-12-31");

/* ----- data ----- */
const rows = ref([]);

/* ----- pagination ----- */
const pageSize = ref(20);
const currentPage = ref(1);

const pageCount = computed(() =>
    Math.max(1, Math.ceil(rows.value.length / pageSize.value))
);

const pagedRows = computed(() => {
    const start = (currentPage.value - 1) * pageSize.value;
    return rows.value.slice(start, start + pageSize.value);
});

const showingFrom = computed(() =>
    rows.value.length === 0 ? 0 : (currentPage.value - 1) * pageSize.value + 1
);
const showingTo = computed(() =>
    Math.min(currentPage.value * pageSize.value, rows.value.length)
);

onMounted(async () => {
    await store.load();
    if (store.meta?.start_date) startDate.value = store.meta.start_date;
    if (store.meta?.end_date) endDate.value = store.meta.end_date;
    refresh();
});

function refresh() {
    const gasMeters = store.gasMeters.filter(
        (m) => !tenant.value || m.tenant === tenant.value
    );
    const days = dateRange(startDate.value, endDate.value);
    const res = [];

    if (mode.value === "daily") {
        for (const day of days) {
            const map = new Map();
            for (const m of gasMeters) {
                const v = syntheticGasDaily(m.meter_id, day);
                map.set(m.tenant, (map.get(m.tenant) || 0) + v);
            }
            for (const [t, v] of map) {
                res.push({ period: day, tenant: t, m3: round(v) });
            }
        }
    }

    if (mode.value === "hourly") {
        for (const day of days) {
            const map = new Map();
            for (const m of gasMeters) {
                const v = syntheticGasDaily(m.meter_id, day);
                map.set(m.tenant, (map.get(m.tenant) || 0) + v);
            }
            for (const [t, daily] of map) {
                const hourly = syntheticGasHourlyFromDaily(daily);
                hourly.forEach((h, i) => {
                    res.push({
                        period: `${day} ${String(i).padStart(2, "0")}:00`,
                        tenant: t,
                        m3: round(h),
                    });
                });
            }
        }
    }

    if (mode.value === "monthly") {
        const map = new Map();
        for (const day of days) {
            const ym = day.slice(0, 7);
            for (const m of gasMeters) {
                const v = syntheticGasDaily(m.meter_id, day);
                const k = `${ym}__${m.tenant}`;
                map.set(k, (map.get(k) || 0) + v);
            }
        }
        for (const [k, v] of map) {
            const [ym, t] = k.split("__");
            res.push({ period: ym, tenant: t, m3: round(v) });
        }
    }

    if (mode.value === "yearly") {
        const map = new Map();
        for (const day of days) {
            const y = day.slice(0, 4);
            for (const m of gasMeters) {
                const v = syntheticGasDaily(m.meter_id, day);
                const k = `${y}__${m.tenant}`;
                map.set(k, (map.get(k) || 0) + v);
            }
        }
        for (const [k, v] of map) {
            const [y, t] = k.split("__");
            res.push({ period: y, tenant: t, m3: round(v) });
        }
    }

    res.sort((a, b) => a.period.localeCompare(b.period) || a.tenant.localeCompare(b.tenant));
    rows.value = res;
    currentPage.value = 1;
}

const topTenants = computed(() => {
    const map = new Map();
    for (const r of rows.value) map.set(r.tenant, (map.get(r.tenant) || 0) + r.m3);
    return Array.from(map.entries())
        .map(([tenant, total]) => ({ tenant, total: round(total) }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 10);
});

function round(v) {
    return Math.round(Number(v) * 10) / 10;
}

function exportCsv() {
    exportToCsv(`gas_${mode.value}_${startDate.value}_to_${endDate.value}.csv`, rows.value);
}
function printPage() {
    window.print();
}

/* ---- pagination nav ---- */
function goFirst() { currentPage.value = 1; }
function goPrev() { currentPage.value = Math.max(1, currentPage.value - 1); }
function goNext() { currentPage.value = Math.min(pageCount.value, currentPage.value + 1); }
function goLast() { currentPage.value = pageCount.value; }

watch(pageSize, () => {
    currentPage.value = Math.min(currentPage.value, pageCount.value);
});
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

.controls {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    align-items: center;
}

.input {
    border: 1px solid #e1e4ea;
    border-radius: 10px;
    padding: 10px;
}

.btn {
    border: 1px solid #e1e4ea;
    background: #f5f7fa;
    padding: 10px 12px;
    border-radius: 10px;
    cursor: pointer;
}

.err {
    color: #e55353;
}

/* ===== TABLE FIX ===== */
.table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
    table-layout: fixed;
    /* 🔑 makes columns stable */
}

.table thead th {
    font-weight: 700;
    color: #2f3542;
    background: #fafbfe;
    text-align: left;
}

.table th,
.table td {
    padding: 10px 8px;
    border-bottom: 1px solid #edf0f5;
    vertical-align: middle;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

/* Align text columns */
.text {
    text-align: left;
}

/* Right-align numeric columns */
.num {
    text-align: left;
    font-variant-numeric: tabular-nums;
}

/* Column sizing for 3-col table (Log Table) */
.table th:nth-child(1),
.table td:nth-child(1) {
    width: 35%;
}

.table th:nth-child(2),
.table td:nth-child(2) {
    width: 45%;
}

.table th:nth-child(3),
.table td:nth-child(3) {
    width: 20%;
}

.empty {
    text-align: center;
    color: #8a94a6;
    padding: 14px 8px;
}

/* ===== PAGER ===== */
.pager {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 12px;
    padding-top: 10px;
    border-top: 1px solid #edf0f5;
    flex-wrap: wrap;
    gap: 12px;
}

.pager-left {
    font-size: 12px;
    color: #8a94a6;
}

.pager-right {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
}

.pagerBtn {
    border: 1px solid #e1e4ea;
    background: #f5f7fa;
    padding: 8px 10px;
    border-radius: 10px;
    cursor: pointer;
}

.pagerBtn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.pagerInput {
    width: 60px;
    border: 1px solid #e1e4ea;
    border-radius: 10px;
    padding: 6px 8px;
}

.pagerSelect {
    border: 1px solid #e1e4ea;
    border-radius: 10px;
    padding: 6px 8px;
}

.pager-size {
    font-size: 12px;
    color: #2f3542;
    display: flex;
    align-items: center;
    gap: 6px;
}
</style>
