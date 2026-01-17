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
                <div class="label">Water Devices</div>
                <div class="value">{{ waterDevices.length }}</div>
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
                    <div class="title">
                        Water Consumption
                        <span v-if="waterApiLoading"
                            style="font-size: 12px; color: #8a94a6; margin-left: 8px">(syncing…)</span>
                    </div>

                    <div class="actions">
                        <button class="btn" @click="printPage">Print</button>
                        <button class="btn" @click="exportSectionCsv('water')">Export CSV</button>
                        <button class="btn" @click="exportSectionPng('water')">Export PNG</button>
                    </div>
                </div>

                <!-- FILTERS -->
                <div class="filters">
                    <!-- Tenant: All Tenants + device_id only -->
                    <div class="filter">
                        <div class="filterLabel">Tenant</div>
                        <select v-model="waterDeviceId" class="input" :disabled="waterDevices.length === 0">
                            <option value="">All Tenants</option>
                            <option v-for="d in waterDevices" :key="d.device_id" :value="d.device_id">
                                {{ d.device_id }}
                            </option>
                        </select>
                    </div>

                    <!-- Gateway: All + fixed gateway id (UI placeholder) -->
                    <div class="filter">
                        <div class="filterLabel">Gateway</div>
                        <select v-model="waterGateway" class="input">
                            <option value="">All Gateways</option>
                            <option :value="WATER_DEFAULT_GATEWAY_ID">{{ WATER_DEFAULT_GATEWAY_ID }}</option>
                        </select>
                    </div>

                    <div class="filter">
                        <div class="filterLabel">Mode</div>
                        <select v-model="waterMode" class="input">
                            <option value="hourly">Hourly</option>
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                        </select>
                    </div>

                    <div class="filter">
                        <div class="filterLabel">Period</div>
                        <input v-if="waterMode === 'hourly' || waterMode === 'daily'" v-model="waterDate" type="date"
                            class="input" />
                        <input v-else-if="waterMode === 'weekly'" v-model="waterWeek" type="week" class="input" />
                        <input v-else v-model="waterMonth" type="month" class="input" />
                    </div>
                </div>

                <!-- SECTION KPIs -->
                <div class="sectionKpis">
                    <div class="skpi">
                        <div class="label">Hourly</div>
                        <div class="value">{{ waterKpiHourly }} <span class="unit">m³</span></div>
                        <div class="sub">{{ waterDate }}</div>
                    </div>
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
const { userRole, tenantName } = useAuth();
const role = computed(() => userRole?.value || "normal_user");
const isNormalUser = computed(() => role.value === "normal_user");
const lockedTenant = computed(() => (isNormalUser.value ? tenantName?.value || "BOOKSTORE" : ""));

/** ---- rounding ---- **/
function r1(n) {
    return Math.round(Number(n) * 10) / 10;
}

/** ---- ISO helpers ---- **/
function startOfWeekFromDate(dateStr) {
    const d = new Date(dateStr);
    const day = d.getDay();
    const diffToMon = (day === 0 ? -6 : 1) - day; // Monday
    d.setDate(d.getDate() + diffToMon);
    return d.toISOString().slice(0, 10);
}
function endOfWeekISO(dateStr) {
    const d = new Date(startOfWeekFromDate(dateStr));
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
function isoWeekToMonday(weekVal) {
    const [yStr, wStr] = weekVal.split("-W");
    const year = Number(yStr);
    const week = Number(wStr);

    const jan4 = new Date(Date.UTC(year, 0, 4));
    const jan4Day = jan4.getUTCDay() || 7;

    const week1Monday = new Date(jan4);
    week1Monday.setUTCDate(jan4.getUTCDate() - (jan4Day - 1));

    const targetMonday = new Date(week1Monday);
    targetMonday.setUTCDate(week1Monday.getUTCDate() + (week - 1) * 7);

    return targetMonday.toISOString().slice(0, 10);
}
function monthStartISO(monthVal) {
    return `${monthVal}-01`;
}
function monthEndISO(monthVal) {
    const [y, m] = monthVal.split("-").map(Number);
    const last = new Date(Date.UTC(y, m, 0));
    return last.toISOString().slice(0, 10);
}
function pad2(n) {
    return String(n).padStart(2, "0");
}
function ymKey(monthVal) {
    const [y, m] = monthVal.split("-").map(Number);
    return y * 100 + m;
}
function todayISO() {
    return new Date().toISOString().slice(0, 10);
}
function currentMonthVal() {
    const t = new Date();
    const y = t.getFullYear();
    const m = String(t.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
}
function weeksOfMonthMondayBlocks(monthVal) {
    const start = monthStartISO(monthVal);
    const end = monthEndISO(monthVal);

    const firstMon = startOfWeekFromDate(start);
    const blocks = [];

    let cur = firstMon;
    let i = 1;

    while (new Date(cur) <= new Date(end)) {
        const wStart = cur;
        const wEnd = endOfWeekISO(cur);

        const clippedStart = new Date(wStart) < new Date(start) ? start : wStart;
        const clippedEnd = new Date(wEnd) > new Date(end) ? end : wEnd;

        blocks.push({ label: `Week ${i}`, start: clippedStart, end: clippedEnd });

        i++;
        const next = new Date(cur);
        next.setDate(next.getDate() + 7);
        cur = next.toISOString().slice(0, 10);
    }

    return blocks;
}
function weeksToShowForMonth(monthVal) {
    const selected = ymKey(monthVal);
    const current = ymKey(currentMonthVal());
    const weeks = weeksOfMonthMondayBlocks(monthVal);
    if (weeks.length === 0) return [];

    if (selected < current) return weeks; // past month => show all
    if (selected > current) return []; // future month => show none

    // current month => show weeks up to (and including) the current week
    const t = todayISO();
    return weeks.filter((w) => w.start <= t);
}

/** ---- store ---- **/
const store = useSiteStore();

/** ---- gas tenant options ---- **/
const tenantOptions = computed(() => {
    if (isNormalUser.value) return [lockedTenant.value];
    return store.tenants || [];
});

/** ---------------------------
 * WATER: devices + daily API
 * --------------------------**/
const DEVICES_URL = "https://midvalley-devices.rshare.io/devices?limit=1000&skip=0";
const WATER_DAILY_BASE = "https://midvalley-devices.rshare.io/daily";

// user can pick "All" or this gateway id (UI placeholder; API doesn't use it)
const WATER_DEFAULT_GATEWAY_ID = "647fdafffe01f876";
const waterGateway = ref(""); // "" = All Gateways, or WATER_DEFAULT_GATEWAY_ID

const waterApiLoading = ref(false);
const waterDevices = ref([]);
const waterDeviceId = ref(""); // "" = All Tenants, or selected device_id

const WATER_FETCH_LIMIT = 1000;
const waterDailyCache = new Map();

async function fetchWaterDaily(deviceId, startDay, endDay, limit = WATER_FETCH_LIMIT, sort = "desc") {
    const key = `${deviceId}|${startDay}|${endDay}|${limit}|${sort}`;
    if (waterDailyCache.has(key)) return waterDailyCache.get(key);

    const url = `${WATER_DAILY_BASE}/${encodeURIComponent(deviceId)}?start_day=${encodeURIComponent(
        startDay
    )}&end_day=${encodeURIComponent(endDay)}&limit=${encodeURIComponent(limit)}&sort=${encodeURIComponent(sort)}`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const arr = Array.isArray(data) ? data : [];
    waterDailyCache.set(key, arr);
    return arr;
}

async function loadWaterDevices() {
    waterApiLoading.value = true;
    try {
        const res = await fetch(DEVICES_URL);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        waterDevices.value = Array.isArray(data) ? data : [];
    } catch (e) {
        console.error("loadWaterDevices failed:", e);
        waterDevices.value = [];
    } finally {
        waterApiLoading.value = false;
    }
}

/** ---- readings -> usage ---- **/
function dailyUsageFromReadings(readings) {
    if (!Array.isArray(readings) || readings.length === 0) return 0;

    let min = Infinity;
    let max = -Infinity;

    for (const r of readings) {
        const v = Number(r?.dispNum);
        if (!Number.isFinite(v)) continue;
        if (v < min) min = v;
        if (v > max) max = v;
    }

    if (!Number.isFinite(min) || !Number.isFinite(max)) return 0;
    return r1(max - min);
}

function hourlyUsageBuckets(readings) {
    const buckets = Array.from({ length: 24 }, () => ({ min: Infinity, max: -Infinity }));

    for (const r of readings || []) {
        const t = String(r?.t || "");
        const hour = Number(t.slice(0, 2));
        const v = Number(r?.dispNum);
        if (!Number.isFinite(hour) || hour < 0 || hour > 23) continue;
        if (!Number.isFinite(v)) continue;

        buckets[hour].min = Math.min(buckets[hour].min, v);
        buckets[hour].max = Math.max(buckets[hour].max, v);
    }

    return buckets.map((b) => {
        if (!Number.isFinite(b.min) || !Number.isFinite(b.max)) return 0;
        return r1(b.max - b.min);
    });
}

/** ---- WATER state ---- **/
const waterMode = ref("weekly");
const waterDate = ref("2026-01-16");
const waterWeek = ref("2026-W03");
const waterMonth = ref("2026-01");

/** ---- GAS state (existing dataset) ---- **/
const gasMode = ref("weekly");
const gasTenant = ref("");
const gasGateway = ref("");
const gasDate = ref("2025-11-01");
const gasWeek = ref("2025-W45");
const gasMonth = ref("2025-11");

/** ---- role defaults ---- **/
function applyRoleDefaults() {
    if (store.meta?.start_date) gasDate.value = store.meta.start_date;
    if (store.meta?.default_week) gasWeek.value = store.meta.default_week;
    if (store.meta?.default_month) gasMonth.value = store.meta.default_month;

    if (isNormalUser.value) {
        gasTenant.value = lockedTenant.value;
        gasGateway.value = "";
    }
}

/** ---- GAS computed ---- **/
const meterDailyGas = computed(() => store.raw?.meter_daily || []);
const gasMeterCount = computed(() => store.meters?.filter((m) => m.meter_type === "gas").length ?? 0);

const gatewayOptionsGas = computed(() => {
    const t = isNormalUser.value ? lockedTenant.value : gasTenant.value || "";
    const set = new Set();

    for (const r of meterDailyGas.value) {
        if (!r) continue;
        if (r.meter_type !== "gas") continue;
        if (t && r.tenant !== t) continue;
        if (r.gateway_id) set.add(r.gateway_id);
    }

    return Array.from(set).sort().map((gateway_id) => ({ gateway_id }));
});

function filterRowsGas({ utility, tenant, gateway, dates }) {
    return meterDailyGas.value.filter((r) => {
        if (!r) return false;
        if (utility && r.meter_type !== utility) return false;

        const enforcedTenant = isNormalUser.value ? lockedTenant.value : "";
        const effectiveTenant = enforcedTenant || tenant;

        if (effectiveTenant && r.tenant !== effectiveTenant) return false;
        if (gateway && r.gateway_id !== gateway) return false;
        if (dates && !dates.has(r.date)) return false;

        return true;
    });
}
function sumConsumption(rows) {
    let t = 0;
    for (const r of rows) t += Number(r.consumption || 0);
    return r1(t);
}

/** ---- KPI labels ---- **/
const waterWeekRangeLabel = computed(() => {
    const start = isoWeekToMonday(waterWeek.value);
    const end = endOfWeekISO(start);
    return `${start} → ${end}`;
});
const gasWeekRangeLabel = computed(() => {
    const start = isoWeekToMonday(gasWeek.value);
    const end = endOfWeekISO(start);
    return `${start} → ${end}`;
});

/** ---- WATER: aggregate for All Tenants ---- **/
function mergeDayToUsageMaps(maps) {
    const out = new Map();
    for (const m of maps) {
        for (const [day, v] of m.entries()) out.set(day, (out.get(day) || 0) + Number(v || 0));
    }
    for (const [k, v] of out.entries()) out.set(k, r1(v));
    return out;
}
async function fetchUsageMapForDevice(deviceId, startDay, endDay) {
    const arr = await fetchWaterDaily(deviceId, startDay, endDay);
    const dayToUsage = new Map();
    for (const item of arr || []) {
        const day = item?.day;
        if (!day) continue;
        dayToUsage.set(day, dailyUsageFromReadings(item?.readings || []));
    }
    return dayToUsage;
}
async function getUsageMapAllTenants(startDay, endDay) {
    const ids = (waterDevices.value || []).map((d) => d.device_id).filter(Boolean);
    if (ids.length === 0) return new Map();

    const maps = await Promise.all(
        ids.map(async (id) => {
            try {
                return await fetchUsageMapForDevice(id, startDay, endDay);
            } catch (e) {
                console.warn("Device fetch failed:", id, e);
                return new Map();
            }
        })
    );

    return mergeDayToUsageMaps(maps);
}

/** ---- WATER KPIs ---- **/
async function getWaterDailyUsage(deviceId, day) {
    if (!deviceId || !day) return 0;
    const arr = await fetchWaterDaily(deviceId, day, day);
    const row = arr?.find((x) => x?.day === day) || arr?.[0];
    return dailyUsageFromReadings(row?.readings || []);
}

const waterKpiDaily = ref(0);
const waterKpiWeekly = ref(0);
const waterKpiHourly = ref(0);

async function refreshWaterKpis() {
    try {
        const isAll = !waterDeviceId.value;

        // Daily + Hourly
        if (isAll) {
            const map = await getUsageMapAllTenants(waterDate.value, waterDate.value);
            waterKpiDaily.value = r1(map.get(waterDate.value) || 0);

            const ids = (waterDevices.value || []).map((d) => d.device_id).filter(Boolean);
            const perDeviceBuckets = await Promise.all(
                ids.map(async (id) => {
                    try {
                        const arr = await fetchWaterDaily(id, waterDate.value, waterDate.value);
                        const row = arr?.find((x) => x?.day === waterDate.value) || arr?.[0];
                        return hourlyUsageBuckets(row?.readings || []);
                    } catch {
                        return Array(24).fill(0);
                    }
                })
            );

            const summed = Array(24).fill(0);
            for (const buckets of perDeviceBuckets) {
                for (let i = 0; i < 24; i++) summed[i] += Number(buckets?.[i] || 0);
            }
            waterKpiHourly.value = r1(summed.reduce((a, b) => a + b, 0));
        } else {
            waterKpiDaily.value = await getWaterDailyUsage(waterDeviceId.value, waterDate.value);

            const arr = await fetchWaterDaily(waterDeviceId.value, waterDate.value, waterDate.value);
            const row = arr?.find((x) => x?.day === waterDate.value) || arr?.[0];
            const buckets = hourlyUsageBuckets(row?.readings || []);
            waterKpiHourly.value = r1(buckets.reduce((a, b) => a + Number(b || 0), 0));
        }

        // Weekly KPI
        {
            const start = isoWeekToMonday(waterWeek.value);
            const end = endOfWeekISO(start);

            const dayToUsage = isAll
                ? await getUsageMapAllTenants(start, end)
                : await fetchUsageMapForDevice(waterDeviceId.value, start, end);

            const days = dateRangeISO(start, end);
            let total = 0;
            for (const d of days) total += Number(dayToUsage.get(d) || 0);
            waterKpiWeekly.value = r1(total);
        }
    } catch (e) {
        console.error("refreshWaterKpis failed:", e);
        waterKpiDaily.value = 0;
        waterKpiWeekly.value = 0;
        waterKpiHourly.value = 0;
    }
}

/** ---- GAS KPIs ---- **/
const gasKpiDaily = computed(() => {
    const dates = new Set([gasDate.value]);
    return sumConsumption(filterRowsGas({ utility: "gas", tenant: gasTenant.value, gateway: gasGateway.value, dates }));
});
const gasKpiWeekly = computed(() => {
    const start = isoWeekToMonday(gasWeek.value);
    const end = endOfWeekISO(start);
    const days = dateRangeISO(start, end);
    return sumConsumption(
        filterRowsGas({ utility: "gas", tenant: gasTenant.value, gateway: gasGateway.value, dates: new Set(days) })
    );
});
const gasKpiMonthly = computed(() => {
    const start = `${gasMonth.value}-01`;
    const end = (() => {
        const [y, m] = gasMonth.value.split("-").map(Number);
        const last = new Date(Date.UTC(y, m, 0));
        return last.toISOString().slice(0, 10);
    })();
    const days = dateRangeISO(start, end);
    return sumConsumption(
        filterRowsGas({ utility: "gas", tenant: gasTenant.value, gateway: gasGateway.value, dates: new Set(days) })
    );
});

/** ---- chart refs ---- **/
const waterCanvas = ref(null);
const gasCanvas = ref(null);
let waterChart = null;
let gasChart = null;

onBeforeUnmount(() => {
    waterChart?.destroy();
    gasChart?.destroy();
});

/** ---- WATER chart data ---- **/
async function buildWaterBarData() {
    const mode = waterMode.value;
    if (!waterDevices.value?.length) return { labels: [], values: [] };
    const isAll = !waterDeviceId.value;

    if (mode === "hourly") {
        const labels = Array.from({ length: 24 }, (_, i) => `${pad2(i)}:00`);

        if (isAll) {
            const ids = (waterDevices.value || []).map((d) => d.device_id).filter(Boolean);
            const perDeviceBuckets = await Promise.all(
                ids.map(async (id) => {
                    try {
                        const arr = await fetchWaterDaily(id, waterDate.value, waterDate.value);
                        const row = arr?.find((x) => x?.day === waterDate.value) || arr?.[0];
                        return hourlyUsageBuckets(row?.readings || []);
                    } catch (e) {
                        console.warn("Hourly device failed:", id, e);
                        return Array(24).fill(0);
                    }
                })
            );

            const summed = Array(24).fill(0);
            for (const buckets of perDeviceBuckets) {
                for (let i = 0; i < 24; i++) summed[i] += Number(buckets?.[i] || 0);
            }

            const values = summed.map(r1);
            return { labels, values };
        }

        const arr = await fetchWaterDaily(waterDeviceId.value, waterDate.value, waterDate.value);
        const row = arr?.find((x) => x?.day === waterDate.value) || arr?.[0];
        const values = hourlyUsageBuckets(row?.readings || []);
        return { labels, values };
    }

    if (mode === "daily") {
        if (isAll) {
            const map = await getUsageMapAllTenants(waterDate.value, waterDate.value);
            const v = r1(map.get(waterDate.value) || 0);
            return { labels: [waterDate.value], values: [v] };
        }

        const v = await getWaterDailyUsage(waterDeviceId.value, waterDate.value);
        return { labels: [waterDate.value], values: [v] };
    }

    if (mode === "weekly") {
        const start = isoWeekToMonday(waterWeek.value);
        const end = endOfWeekISO(start);

        const dayToUsage = isAll
            ? await getUsageMapAllTenants(start, end)
            : await fetchUsageMapForDevice(waterDeviceId.value, start, end);

        const days = dateRangeISO(start, end);
        const labels = [];
        const values = [];
        for (const d of days) {
            labels.push(d);
            values.push(r1(dayToUsage.get(d) || 0));
        }

        return { labels, values };
    }

    // Monthly: Week 1..Week N (include current week); partial-sum current week up to today
    const weeks = weeksToShowForMonth(waterMonth.value);
    if (weeks.length === 0) return { labels: [], values: [] };

    const monthStart = monthStartISO(waterMonth.value);
    const monthEnd = monthEndISO(waterMonth.value);

    const dayToUsage = isAll
        ? await getUsageMapAllTenants(monthStart, monthEnd)
        : await fetchUsageMapForDevice(waterDeviceId.value, monthStart, monthEnd);

    const labels = [];
    const values = [];

    const selected = ymKey(waterMonth.value);
    const current = ymKey(currentMonthVal());
    const t = todayISO();
    const isCurrentMonth = selected === current;

    for (const w of weeks) {
        const effectiveEnd = isCurrentMonth && w.start <= t && t <= w.end ? t : w.end;
        const days = dateRangeISO(w.start, effectiveEnd);

        let sum = 0;
        for (const d of days) sum += Number(dayToUsage.get(d) || 0);

        labels.push(w.label);
        values.push(r1(sum));
    }

    return { labels, values };
}

/** ---- GAS chart data (existing) ---- **/
function buildGasBarData({ utility, mode, tenant, gateway, date, week, month }) {
    const labels = [];
    const values = [];

    if (mode === "daily") {
        const rows = filterRowsGas({ utility, tenant, gateway, dates: new Set([date]) });
        labels.push(date);
        values.push(sumConsumption(rows));
    }

    if (mode === "weekly") {
        const start = isoWeekToMonday(week);
        const end = endOfWeekISO(start);
        const days = dateRangeISO(start, end);

        for (const d of days) {
            const rows = filterRowsGas({ utility, tenant, gateway, dates: new Set([d]) });
            labels.push(d);
            values.push(sumConsumption(rows));
        }
    }

    if (mode === "monthly") {
        const start = `${month}-01`;
        const end = (() => {
            const [y, m] = month.split("-").map(Number);
            const last = new Date(Date.UTC(y, m, 0));
            return last.toISOString().slice(0, 10);
        })();
        const days = dateRangeISO(start, end);

        for (const d of days) {
            const rows = filterRowsGas({ utility, tenant, gateway, dates: new Set([d]) });
            labels.push(d);
            values.push(sumConsumption(rows));
        }
    }

    return { labels, values };
}

/** ---- chart builders ---- **/
async function buildWaterChart() {
    if (!waterCanvas.value) return;

    waterApiLoading.value = true;
    try {
        const { labels, values } = await buildWaterBarData();

        waterChart?.destroy();
        waterChart = new Chart(waterCanvas.value, {
            type: "bar",
            data: { labels, datasets: [{ label: "Water (m³)", data: values }] },
            options: { responsive: true, maintainAspectRatio: false }
        });
    } catch (e) {
        console.error("buildWaterChart failed:", e);
        waterChart?.destroy();
        waterChart = new Chart(waterCanvas.value, {
            type: "bar",
            data: { labels: [], datasets: [{ label: "Water (m³)", data: [] }] },
            options: { responsive: true, maintainAspectRatio: false }
        });
    } finally {
        waterApiLoading.value = false;
    }
}

function buildGasChart() {
    if (!gasCanvas.value) return;

    const { labels, values } = buildGasBarData({
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
watch([waterMode, waterDeviceId, waterGateway, waterDate, waterWeek, waterMonth], async () => {
    await refreshWaterKpis();
    await buildWaterChart();
});
watch([gasMode, gasTenant, gasGateway, gasDate, gasWeek, gasMonth], buildGasChart);

/** ---- export ---- **/
async function exportSectionCsv(utility) {
    if (utility === "water") {
        const { labels, values } = await buildWaterBarData();
        const out = labels.map((p, i) => ({
            utility: "water",
            mode: waterMode.value,
            tenant: waterDeviceId.value || "ALL",
            gateway: waterGateway.value || "ALL",
            period: p,
            m3: values[i]
        }));
        exportToCsv(`water_${waterMode.value}_${waterDeviceId.value || "ALL"}.csv`, out);
        return;
    }

    const { labels, values } = buildGasBarData({
        utility,
        mode: gasMode.value,
        tenant: gasTenant.value,
        gateway: gasGateway.value,
        date: gasDate.value,
        week: gasWeek.value,
        month: gasMonth.value
    });

    const out = labels.map((p, i) => ({
        utility,
        mode: gasMode.value,
        tenant: isNormalUser.value ? lockedTenant.value : gasTenant.value || "ALL",
        gateway: gasGateway.value || "ALL",
        period: p,
        m3: values[i]
    }));

    exportToCsv(`${utility}_${gasMode.value}_${gasTenant.value || "ALL"}_${gasGateway.value || "ALL"}.csv`, out);
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

/** ---- mount ---- **/
onMounted(async () => {
    await store.load();
    applyRoleDefaults();

    await loadWaterDevices();

    await refreshWaterKpis();
    await buildWaterChart();
    buildGasChart();
});

/** ---- destroy ---- **/
onBeforeUnmount(() => {
    waterChart?.destroy();
    gasChart?.destroy();
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
