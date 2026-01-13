<template>
    <div v-if="store.loading">Loading dataset…</div>
    <div v-else-if="store.error" class="err">Error: {{ store.error }}</div>

    <div v-else class="wrap">
        <!-- GLOBAL KPI (admins only) -->
        <div v-if="!isNormalUser" class="kpis">
            <div class="kpi">
                <div class="label">Tenants</div>
                <div class="value">{{ store.tenants?.length ?? 0 }}</div>
            </div>
            <div class="kpi">
                <div class="label">Gateways</div>
                <div class="value">{{ store.gatewaysResolved?.length ?? 0 }}</div>
            </div>
            <div class="kpi">
                <div class="label">Water Meters</div>
                <div class="value">{{ waterMeterCount }}</div>
            </div>
            <div class="kpi">
                <div class="label">Gas Meters</div>
                <div class="value">{{ gasMeterCount }}</div>
            </div>
        </div>


        <!-- TWO-COLUMN CHARTS -->
        <div class="charts">
            <!-- WATER (LEFT) -->
            <section class="card">
                <div class="header">
                    <div class="title">Water Consumption</div>

                    <div class="actions">
                        <button class="btn" @click="printPage">Print</button>
                        <button class="btn" @click="exportSectionCsv('water')">Export CSV</button>
                        <button class="btn" @click="exportSectionPng('water')">Export PNG</button>
                    </div>
                </div>

                <!-- FILTERS -->
                <div class="filters">
                    <div class="filter">
                        <div class="filterLabel">Tenant</div>
                        <select v-model="waterTenant" class="input" :disabled="isNormalUser">
                            <option value="">All Tenants</option>
                            <option v-for="t in tenantOptions" :key="t" :value="t">{{ t }}</option>
                        </select>
                    </div>

                    <div class="filter">
                        <div class="filterLabel">Gateway</div>
                        <select v-model="waterGateway" class="input"
                            :disabled="isNormalUser && gatewayOptionsWater.length <= 1">
                            <option value="">All Gateways</option>
                            <option v-for="g in gatewayOptionsWater" :key="g.gateway_id" :value="g.gateway_id">
                                {{ g.gateway_id }}
                            </option>
                        </select>
                    </div>

                    <div class="filter">
                        <div class="filterLabel">Mode</div>
                        <select v-model="waterMode" class="input">
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                        </select>
                    </div>

                    <div class="filter">
                        <div class="filterLabel">Period</div>
                        <input v-if="waterMode === 'daily'" v-model="waterDate" type="date" class="input" />
                        <input v-else-if="waterMode === 'weekly'" v-model="waterWeek" type="week" class="input" />
                        <input v-else v-model="waterMonth" type="month" class="input" />
                    </div>
                </div>

                <!-- SECTION KPIs -->
                <div class="sectionKpis">
                    <div class="skpi">
                        <div class="label">Daily</div>
                        <div class="value">{{ waterKpiDaily }} <span class="unit">m³</span></div>
                        <div class="sub">{{ waterDate }}</div>
                    </div>
                    <div class="skpi">
                        <div class="label">Weekly</div>
                        <div class="value">{{ waterKpiWeekly }} <span class="unit">m³</span></div>
                        <div class="sub">{{ waterWeekRangeLabel }}</div>
                    </div>
                    <div class="skpi">
                        <div class="label">Monthly</div>
                        <div class="value">{{ waterKpiMonthly }} <span class="unit">m³</span></div>
                        <div class="sub">{{ waterMonth }}</div>
                    </div>
                </div>

                <!-- CHART -->
                <div class="chartWrap">
                    <canvas ref="waterCanvas"></canvas>
                </div>
            </section>

            <!-- GAS (RIGHT) -->
            <section class="card">
                <div class="header">
                    <div class="title">Gas Consumption</div>

                    <div class="actions">
                        <button class="btn" @click="printPage">Print</button>
                        <button class="btn" @click="exportSectionCsv('gas')">Export CSV</button>
                        <button class="btn" @click="exportSectionPng('gas')">Export PNG</button>
                    </div>
                </div>

                <!-- FILTERS -->
                <div class="filters">
                    <div class="filter">
                        <div class="filterLabel">Tenant</div>
                        <select v-model="gasTenant" class="input" :disabled="isNormalUser">
                            <option value="">All Tenants</option>
                            <option v-for="t in tenantOptions" :key="t" :value="t">{{ t }}</option>
                        </select>
                    </div>

                    <div class="filter">
                        <div class="filterLabel">Gateway</div>
                        <select v-model="gasGateway" class="input"
                            :disabled="isNormalUser && gatewayOptionsGas.length <= 1">
                            <option value="">All Gateways</option>
                            <option v-for="g in gatewayOptionsGas" :key="g.gateway_id" :value="g.gateway_id">
                                {{ g.gateway_id }}
                            </option>
                        </select>
                    </div>

                    <div class="filter">
                        <div class="filterLabel">Mode</div>
                        <select v-model="gasMode" class="input">
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                        </select>
                    </div>

                    <div class="filter">
                        <div class="filterLabel">Period</div>
                        <input v-if="gasMode === 'daily'" v-model="gasDate" type="date" class="input" />
                        <input v-else-if="gasMode === 'weekly'" v-model="gasWeek" type="week" class="input" />
                        <input v-else v-model="gasMonth" type="month" class="input" />
                    </div>
                </div>

                <!-- SECTION KPIs -->
                <div class="sectionKpis">
                    <div class="skpi">
                        <div class="label">Daily</div>
                        <div class="value">{{ gasKpiDaily }} <span class="unit">m³</span></div>
                        <div class="sub">{{ gasDate }}</div>
                    </div>
                    <div class="skpi">
                        <div class="label">Weekly</div>
                        <div class="value">{{ gasKpiWeekly }} <span class="unit">m³</span></div>
                        <div class="sub">{{ gasWeekRangeLabel }}</div>
                    </div>
                    <div class="skpi">
                        <div class="label">Monthly</div>
                        <div class="value">{{ gasKpiMonthly }} <span class="unit">m³</span></div>
                        <div class="sub">{{ gasMonth }}</div>
                    </div>
                </div>

                <!-- CHART -->
                <div class="chartWrap">
                    <canvas ref="gasCanvas"></canvas>
                </div>
            </section>
        </div>
    </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import Chart from "chart.js/auto";
import { useSiteStore } from "../stores/siteStore";
import { exportToCsv } from "../utils/exportCsv";
import { useAuth } from "../stores/auth";

/** ---- auth (role-based) ---- **/
const { userRole, siteId, tenantName } = useAuth(); // rename if your store differs
const role = computed(() => userRole?.value || "normal_user");
const isSuperAdmin = computed(() => role.value === "super_admin");
const isSiteAdmin = computed(() => role.value === "site_admin");
const isNormalUser = computed(() => role.value === "normal_user");
const lockedTenant = computed(() => (isNormalUser.value ? (tenantName?.value || "BOOKSTORE") : ""));

/** ---- date helpers ---- **/
function r1(n) { return Math.round(Number(n) * 10) / 10; }

function startOfWeekISO(dateStr) {
    const d = new Date(dateStr);
    const day = d.getDay();
    const diff = (day === 0 ? -6 : 1) - day;
    d.setDate(d.getDate() + diff);
    return d.toISOString().slice(0, 10);
}
function endOfWeekISO(dateStr) {
    const d = new Date(startOfWeekISO(dateStr));
    d.setDate(d.getDate() + 6);
    return d.toISOString().slice(0, 10);
}
function dateRangeISO(start, end) {
    const out = [];
    let d = new Date(start);
    const e = new Date(end);
    while (d <= e) {
        out.push(d.toISOString().slice(0, 10));
        d.setDate(d.getDate() + 1);
    }
    return out;
}
function weeksOfMonthISO(dateStr) {
    const d = new Date(dateStr);
    const y = d.getFullYear();
    const m = d.getMonth();
    const first = new Date(y, m, 1);
    const last = new Date(y, m + 1, 0);

    const weeks = [];
    let cur = startOfWeekISO(first.toISOString().slice(0, 10));
    while (new Date(cur) <= last) {
        const start = cur;
        const end = endOfWeekISO(cur);
        weeks.push({ start, end });
        const next = new Date(cur);
        next.setDate(next.getDate() + 7);
        cur = next.toISOString().slice(0, 10);
    }
    return weeks;
}
function weekValueToRefDate(weekVal) {
    const [y, w] = weekVal.split("-W");
    const d = new Date(Number(y), 0, 1 + (Number(w) - 1) * 7);
    return d.toISOString().slice(0, 10);
}
function monthValueToRefDate(monthVal) {
    return `${monthVal}-01`;
}

/** ---- store ---- **/
const store = useSiteStore();

onMounted(async () => {
    await store.load();

    // ✅ Apply role defaults AFTER dataset loads
    applyRoleDefaults();

    buildWaterChart();
    buildGasChart();
});

const meterDaily = computed(() => store.raw?.meter_daily || []);
const waterMeterCount = computed(() => store.meters?.filter(m => m.meter_type === "water").length ?? 0);
const gasMeterCount = computed(() => store.meters?.filter(m => m.meter_type === "gas").length ?? 0);

/** ---- options filtered by role ---- **/
const tenantOptions = computed(() => {
    if (isNormalUser.value) return [lockedTenant.value];
    return store.tenants || [];
});

function gatewayIdsForTenant(tenant) {
    // Look into meter_daily rows to find which gateways belong to this tenant.
    const set = new Set();
    for (const r of meterDaily.value) {
        if (!r) continue;
        if (tenant && r.tenant !== tenant) continue;
        if (r.gateway_id) set.add(r.gateway_id);
    }
    return set;
}

const gatewayOptionsWater = computed(() => {
    // derive gateway ids from meter_daily, filtered by tenant + meter_type
    const t = isNormalUser.value ? lockedTenant.value : (waterTenant.value || "");
    const set = new Set();

    for (const r of meterDaily.value) {
        if (!r) continue;
        if (r.meter_type !== "water") continue;
        if (t && r.tenant !== t) continue;
        if (r.gateway_id) set.add(r.gateway_id);
    }

    // return as array of { gateway_id } like your template expects
    return Array.from(set).sort().map(gateway_id => ({ gateway_id }));
});

const gatewayOptionsGas = computed(() => {
    const t = isNormalUser.value ? lockedTenant.value : (gasTenant.value || "");
    const set = new Set();

    for (const r of meterDaily.value) {
        if (!r) continue;
        if (r.meter_type !== "gas") continue;
        if (t && r.tenant !== t) continue;
        if (r.gateway_id) set.add(r.gateway_id);
    }

    return Array.from(set).sort().map(gateway_id => ({ gateway_id }));
});


/** ---- water state ---- **/
const waterMode = ref("weekly");
const waterTenant = ref("");
const waterGateway = ref("");
const waterDate = ref("2025-11-01");
const waterWeek = ref("2025-W45");
const waterMonth = ref("2025-11");

/** ---- gas state ---- **/
const gasMode = ref("weekly");
const gasTenant = ref("");
const gasGateway = ref("");
const gasDate = ref("2025-11-01");
const gasWeek = ref("2025-W45");
const gasMonth = ref("2025-11");

/** ---- role defaults ---- **/
function applyRoleDefaults() {
    // Default date bounds from meta if available
    if (store.meta?.start_date) {
        waterDate.value = store.meta.start_date;
        gasDate.value = store.meta.start_date;
    }
    if (store.meta?.default_week) {
        waterWeek.value = store.meta.default_week;
        gasWeek.value = store.meta.default_week;
    }
    if (store.meta?.default_month) {
        waterMonth.value = store.meta.default_month;
        gasMonth.value = store.meta.default_month;
    }

    // Normal user: lock tenant + auto pick gateway (optional)
    if (isNormalUser.value) {
        waterTenant.value = lockedTenant.value;
        gasTenant.value = lockedTenant.value;

        // ✅ default = All Gateways
        waterGateway.value = "";
        gasGateway.value = "";
    }


}

/** ---- chart refs ---- **/
const waterCanvas = ref(null);
const gasCanvas = ref(null);
let waterChart = null;
let gasChart = null;

onBeforeUnmount(() => {
    waterChart?.destroy();
    gasChart?.destroy();
});

/** ---- filtering + aggregation ---- **/
function filterRows({ utility, tenant, gateway, dates }) {
    return meterDaily.value.filter(r => {
        if (!r) return false;
        if (utility && r.meter_type !== utility) return false;

        // ✅ role enforcement (hard filter)
        const enforcedTenant = isNormalUser.value ? lockedTenant.value : "";
        const effectiveTenant = enforcedTenant || tenant;

        if (effectiveTenant && r.tenant !== effectiveTenant) return false;
        if (gateway && r.gateway_id !== gateway) return false;
        if (dates && !dates.has(r.date)) return false;

        // site admin restriction can go here later when your dataset has site_id:
        // if (isSiteAdmin.value && siteId?.value && r.site_id !== siteId.value) return false;

        return true;
    });
}

function sumConsumption(rows) {
    let t = 0;
    for (const r of rows) t += Number(r.consumption || 0);
    return r1(t);
}

/** ---- KPIs ---- **/
const waterWeekRangeLabel = computed(() => {
    const refD = weekValueToRefDate(waterWeek.value);
    return `${startOfWeekISO(refD)} → ${endOfWeekISO(refD)}`;
});
const gasWeekRangeLabel = computed(() => {
    const refD = weekValueToRefDate(gasWeek.value);
    return `${startOfWeekISO(refD)} → ${endOfWeekISO(refD)}`;
});

const waterKpiDaily = computed(() => {
    const dates = new Set([waterDate.value]);
    return sumConsumption(filterRows({ utility: "water", tenant: waterTenant.value, gateway: waterGateway.value, dates }));
});
const gasKpiDaily = computed(() => {
    const dates = new Set([gasDate.value]);
    return sumConsumption(filterRows({ utility: "gas", tenant: gasTenant.value, gateway: gasGateway.value, dates }));
});

const waterKpiWeekly = computed(() => {
    const refD = weekValueToRefDate(waterWeek.value);
    const days = dateRangeISO(startOfWeekISO(refD), endOfWeekISO(refD));
    return sumConsumption(filterRows({ utility: "water", tenant: waterTenant.value, gateway: waterGateway.value, dates: new Set(days) }));
});
const gasKpiWeekly = computed(() => {
    const refD = weekValueToRefDate(gasWeek.value);
    const days = dateRangeISO(startOfWeekISO(refD), endOfWeekISO(refD));
    return sumConsumption(filterRows({ utility: "gas", tenant: gasTenant.value, gateway: gasGateway.value, dates: new Set(days) }));
});

const waterKpiMonthly = computed(() => {
    const refD = monthValueToRefDate(waterMonth.value);
    const weeks = weeksOfMonthISO(refD);
    const days = weeks.flatMap(w => dateRangeISO(w.start, w.end));
    return sumConsumption(filterRows({ utility: "water", tenant: waterTenant.value, gateway: waterGateway.value, dates: new Set(days) }));
});
const gasKpiMonthly = computed(() => {
    const refD = monthValueToRefDate(gasMonth.value);
    const weeks = weeksOfMonthISO(refD);
    const days = weeks.flatMap(w => dateRangeISO(w.start, w.end));
    return sumConsumption(filterRows({ utility: "gas", tenant: gasTenant.value, gateway: gasGateway.value, dates: new Set(days) }));
});

/** ---- chart data ---- **/
function buildBarData({ utility, mode, tenant, gateway, date, week, month }) {
    const labels = [];
    const values = [];

    if (mode === "daily") {
        const rows = filterRows({ utility, tenant, gateway, dates: new Set([date]) });
        labels.push(date);
        values.push(sumConsumption(rows));
    }

    if (mode === "weekly") {
        const refD = weekValueToRefDate(week);
        const start = startOfWeekISO(refD);
        const end = endOfWeekISO(refD);
        const days = dateRangeISO(start, end);

        for (const d of days) {
            const rows = filterRows({ utility, tenant, gateway, dates: new Set([d]) });
            labels.push(d);
            values.push(sumConsumption(rows));
        }
    }

    if (mode === "monthly") {
        const refD = monthValueToRefDate(month);
        const weeks = weeksOfMonthISO(refD);

        weeks.forEach((w, i) => {
            const days = dateRangeISO(w.start, w.end);
            const rows = filterRows({ utility, tenant, gateway, dates: new Set(days) });
            labels.push(`Week ${i + 1}`);
            values.push(sumConsumption(rows));
        });
    }

    return { labels, values };
}

/** ---- chart builders ---- **/
function buildWaterChart() {
    if (!waterCanvas.value) return;

    const { labels, values } = buildBarData({
        utility: "water",
        mode: waterMode.value,
        tenant: waterTenant.value,
        gateway: waterGateway.value,
        date: waterDate.value,
        week: waterWeek.value,
        month: waterMonth.value
    });

    waterChart?.destroy();
    waterChart = new Chart(waterCanvas.value, {
        type: "bar",
        data: { labels, datasets: [{ label: "Water (m³)", data: values }] },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

function buildGasChart() {
    if (!gasCanvas.value) return;

    const { labels, values } = buildBarData({
        utility: "gas",
        mode: gasMode.value,
        tenant: gasTenant.value,
        gateway: gasGateway.value,
        date: gasDate.value,
        week: gasWeek.value,
        month: gasMonth.value
    });

    gasChart?.destroy();
    gasChart = new Chart(gasCanvas.value, {
        type: "bar",
        data: { labels, datasets: [{ label: "Gas (m³)", data: values }] },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

/** ---- watchers ---- **/
watch([waterMode, waterTenant, waterGateway, waterDate, waterWeek, waterMonth], buildWaterChart);
watch([gasMode, gasTenant, gasGateway, gasDate, gasWeek, gasMonth], buildGasChart);

// If role/tenant changes at runtime, re-apply lock
watch([role, lockedTenant], () => {
    if (isNormalUser.value) {
        waterTenant.value = lockedTenant.value;
        gasTenant.value = lockedTenant.value;
    }
    buildWaterChart();
    buildGasChart();
});

/** ---- export ---- **/
function exportSectionCsv(utility) {
    const isWater = utility === "water";
    const mode = isWater ? waterMode.value : gasMode.value;
    const tenant = isWater ? waterTenant.value : gasTenant.value;
    const gateway = isWater ? waterGateway.value : gasGateway.value;
    const date = isWater ? waterDate.value : gasDate.value;
    const week = isWater ? waterWeek.value : gasWeek.value;
    const month = isWater ? waterMonth.value : gasMonth.value;

    const { labels, values } = buildBarData({ utility, mode, tenant, gateway, date, week, month });

    const out = labels.map((p, i) => ({
        utility,
        mode,
        tenant: (isNormalUser.value ? lockedTenant.value : (tenant || "ALL")),
        gateway: gateway || "ALL",
        period: p,
        m3: values[i]
    }));

    exportToCsv(`${utility}_${mode}_${(tenant || "ALL")}_${(gateway || "ALL")}.csv`, out);
}

function exportSectionPng(utility) {
    const chart = utility === "water" ? waterChart : gasChart;
    if (!chart) return;
    const a = document.createElement("a");
    a.href = chart.toBase64Image();
    a.download = `${utility}_${utility === "water" ? waterMode.value : gasMode.value}.png`;
    a.click();
}

function printPage() {
    window.print();
}

watch([gatewayOptionsWater, gatewayOptionsGas], () => {
    if (!isNormalUser.value) return;

    // if currently "All", snap to first available
    if (!waterGateway.value) waterGateway.value = gatewayOptionsWater.value[0]?.gateway_id ?? "";
    if (!gasGateway.value) gasGateway.value = gatewayOptionsGas.value[0]?.gateway_id ?? "";
});

</script>

<style scoped>
.wrap {
    display: grid;
    gap: 16px;
}

.kpis {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
}

.kpi {
    background: #fff;
    border: 1px solid #e1e4ea;
    border-radius: 12px;
    padding: 12px;
}

.label {
    font-size: 12px;
    color: #8a94a6;
}

.value {
    font-size: 22px;
    font-weight: 800;
    color: #2f3542;
}

.unit {
    font-size: 12px;
    color: #8a94a6;
    font-weight: 800;
    margin-left: 4px;
}

.charts {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
}

.card {
    background: #fff;
    border: 1px solid #e1e4ea;
    border-radius: 12px;
    padding: 14px;
}

.header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
}

.title {
    font-weight: 800;
    color: #2f3542;
}

.actions {
    display: flex;
    gap: 10px;
    margin-left: auto;
}

.filters {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
    margin-top: 12px;
}

.filterLabel {
    font-size: 12px;
    color: #8a94a6;
    margin-bottom: 6px;
}

.input {
    width: 100%;
    border: 1px solid #e1e4ea;
    border-radius: 10px;
    padding: 10px;
}

.input:disabled {
    background: #f2f4f8;
    color: #6b7280;
    cursor: not-allowed;
}

.sectionKpis {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
    margin-top: 12px;
}

.skpi {
    border: 1px solid #eef1f7;
    border-radius: 12px;
    padding: 10px;
    background: #fafbfe;
}

.skpi .label {
    font-size: 12px;
    color: #8a94a6;
}

.skpi .value {
    font-size: 18px;
    font-weight: 900;
    color: #2f3542;
    margin-top: 4px;
}

.sub {
    font-size: 12px;
    color: #8a94a6;
    margin-top: 4px;
}

.btn {
    border: 1px solid #e1e4ea;
    background: #f5f7fa;
    padding: 10px 12px;
    border-radius: 10px;
    cursor: pointer;
}

.chartWrap {
    height: 320px;
    margin-top: 12px;
}

.err {
    color: #e55353;
}

@media (max-width: 1200px) {
    .kpis {
        grid-template-columns: repeat(2, 1fr);
    }

    .charts {
        grid-template-columns: 1fr;
    }

    .filters {
        grid-template-columns: repeat(2, 1fr);
    }
}

canvas {
    max-width: 100%;
}
</style>
