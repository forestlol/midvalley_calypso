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
        <!-- TEMP + HUM (FULL WIDTH, ABOVE BOTH) -->
        <section class="card fullWidth">
            <div class="header">
                <div class="title">
                    Temperature & Humidity
                    <span v-if="thApiLoading"
                        style="font-size: 12px; color: #8a94a6; margin-left: 8px">(syncing…)</span>
                </div>

                <div class="actions">
                    <button class="btn" @click="printPage">Print</button>
                    <button class="btn" @click="exportSectionCsv('th')">Export CSV</button>
                    <button class="btn" @click="exportSectionPng('th')">Export PNG</button>
                </div>
            </div>

            <div class="filters">
                <div class="filter">
                    <div class="filterLabel">Device</div>
                    <select v-model="thDeviceId" class="input" :disabled="thDevices.length === 0">
                        <option v-for="id in thDevices" :key="id" :value="id">{{ id }}</option>
                    </select>
                </div>

                <!-- Gateway: same pattern as Water (UI placeholder only) -->
                <div class="filter">
                    <div class="filterLabel">Gateway</div>
                    <select v-model="thGateway" class="input">
                        <option value="">All Gateways</option>
                        <option :value="TH_DEFAULT_GATEWAY_ID">{{ TH_DEFAULT_GATEWAY_ID }}</option>
                    </select>
                </div>

                <div class="filter">
                    <div class="filterLabel">Mode</div>
                    <select v-model="thMode" class="input">
                        <option value="hourly">Hourly</option>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                    </select>
                </div>

                <div class="filter">
                    <div class="filterLabel">Period</div>
                    <input v-if="thMode === 'hourly' || thMode === 'daily'" v-model="thDate" type="date"
                        class="input" :max="thLatestDate" />
                    <input v-else-if="thMode === 'weekly'" v-model="thWeek" type="week" class="input"
                        :max="thLatestWeek" />
                    <input v-else v-model="thMonth" type="month" class="input" :max="thLatestMonth" />
                </div>

                <!-- NEW: Metric selector (Temperature OR Humidity) -->
                <div class="filter">
                    <div class="filterLabel">Metric</div>
                    <select v-model="thMetric" class="input">
                        <option value="overall">Overall</option>
                        <option value="temp">Temperature (°C)</option>
                        <option value="hum">Humidity (%RH)</option>
                    </select>
                </div>

                <div class="filter">
                    <div class="filterLabel">Average</div>
                    <div class="input" style="background:#fafbfe; display:flex; align-items:center; gap:10px;">
                        <template v-if="thMetric === 'temp'">
                            <span><b>{{ thKpiTemp }}</b> °C</span>
                        </template>
                        <template v-else-if="thMetric === 'hum'">
                            <span><b>{{ thKpiHum }}</b> %RH</span>
                        </template>
                        <template v-else>
                            <span><b>{{ thKpiTemp }}</b> °C / <b>{{ thKpiHum }}</b> %RH</span>
                        </template>
                    </div>
                </div>
            </div>

            <!-- CHART -->
            <div class="chartWrap thChartWrap">
                <canvas ref="thCanvas"></canvas>
            </div>
        </section>

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
                            class="input" :max="waterCurrentDisplayDate" />
                        <input v-else-if="waterMode === 'weekly'" v-model="waterWeek" type="week" class="input"
                            :max="waterCurrentWeek" />
                        <input v-else v-model="waterMonth" type="month" class="input" :max="waterCurrentMonth" />
                    </div>
                </div>

                <!-- SECTION KPIs -->
                <div class="sectionKpis waterKpis4">
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

                    <div class="skpi">
                        <div class="label">Cumulative (Latest)</div>
                        <div class="value">{{ waterKpiCumulative }} <span class="unit">m³</span></div>
                        <div class="sub">{{ waterKpiCumulativeTs || "—" }}</div>
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
                        <input v-if="gasMode === 'daily'" v-model="gasDate" type="date" class="input"
                            :max="gasLatestDate" />
                        <input v-else-if="gasMode === 'weekly'" v-model="gasWeek" type="week" class="input"
                            :max="gasLatestWeek" />
                        <input v-else v-model="gasMonth" type="month" class="input" :max="gasLatestMonth" />
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

        <div v-if="showNoDataModal" class="modalBackdrop" @click.self="closeNoDataModal">
            <div class="modalCard">
                <div class="modalTitle">No Data</div>
                <div class="modalText">{{ noDataMessage }}</div>
                <div class="modalActions">
                    <button class="btn" @click="closeNoDataModal">Close</button>
                </div>
            </div>
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

/** ---------------------------
 * TEMP + HUM: devices + timeseries API
 * --------------------------**/
const DEFAULT_TH_DEVICE_ID = "647FDA0000022695";
const TH_DEVICES_URL = "https://midvalley-temperature.rshare.io/api/konamicro/temperature-sensors?enabled=true&limit=500";
const TH_TS_URL = "https://midvalley-temperature.rshare.io/api/konamicro/temperature/timeseries";

const thApiLoading = ref(false);
const thDevices = ref([]);
const thDeviceId = ref(DEFAULT_TH_DEVICE_ID);

const thMode = ref("hourly");
const thDate = ref(todayISO());    // default today
const thWeek = ref(isoDateToWeekValue(todayISO()));
const thMonth = ref(currentMonthVal());
const thLatestDate = ref(todaySgtISO());
const thLatestWeek = computed(() => isoDateToWeekValue(completedDataCutoffISO(thLatestDate.value)));
const thLatestMonth = computed(() => (thLatestDate.value || todaySgtISO()).slice(0, 7));

const thKpiTemp = ref(0);
const thKpiHum = ref(0);

const thCanvas = ref(null);
let thChart = null;

const thCache = new Map(); // key: device|start|end|limit

// ---- SGT "now" helpers (works even if your browser is not in +8) ----
const SGT_OFFSET_MS = 8 * 60 * 60 * 1000;

function nowSgtDateObj() {
    // take current UTC time, then shift to SGT
    return new Date(Date.now() + SGT_OFFSET_MS);
}

function todaySgtISO() {
    const d = nowSgtDateObj();
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(d.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${dd}`;
}

const TEMP_COLOR = {
    line: "rgba(102, 187, 106, 1)",      // light green
    fill: "rgba(102, 187, 106, 0.2)",
    point: "rgba(102, 187, 106, 1)"
};


const HUM_COLOR = {
    line: "rgba(171, 71, 188, 1)",       // light purple
    fill: "rgba(171, 71, 188, 0.2)",
    point: "rgba(171, 71, 188, 1)"
};



function currentHourSgt() {
    const d = nowSgtDateObj();
    return d.getUTCHours(); // 0..23
}

function currentMonthValSgt() {
    const d = nowSgtDateObj();
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
}

function latestReadingInDay(readings, dayStr) {
    // returns { value, label, ms } for latest reading in that day
    let bestMs = -Infinity;
    let bestVal = 0;
    let bestLabel = "";

    for (const r of readings || []) {
        const v = Number(r?.dispNum);
        if (!Number.isFinite(v)) continue;

        const ms = parseReadingTsToMs(r?.t, dayStr);
        if (ms > bestMs) {
            bestMs = ms;
            bestVal = v;
            bestLabel = formatDayTime(dayStr, r?.t);
        }
    }

    return { value: r1(bestVal), label: bestLabel, ms: bestMs };
}

function cumulativeHourlyFromReadings(readings, dayStr) {
    // cumulative per hour: the latest dispNum seen up to that hour
    const perHourLatestMs = Array(24).fill(-Infinity);
    const perHourVal = Array(24).fill(0);

    for (const r of readings || []) {
        const t = String(r?.t || "");
        const hour = Number(t.slice(0, 2));
        const v = Number(r?.dispNum);
        if (!Number.isFinite(hour) || hour < 0 || hour > 23) continue;
        if (!Number.isFinite(v)) continue;

        const ms = parseReadingTsToMs(r?.t, dayStr);
        if (ms > perHourLatestMs[hour]) {
            perHourLatestMs[hour] = ms;
            perHourVal[hour] = v;
        }
    }

    // forward-fill (if hour has no reading, use last known)
    let last = 0;
    return perHourVal.map((v, i) => {
        if (perHourLatestMs[i] === -Infinity) return r1(last);
        last = v;
        return r1(v);
    });
}

async function loadTHDevices() {
    thApiLoading.value = true;
    try {
        const res = await fetch(TH_DEVICES_URL);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        const ids = (Array.isArray(data?.sensors) ? data.sensors : [])
            .map((sensor) => String(sensor?.device_id || "").trim())
            .filter(Boolean);

        thDevices.value = ids;
        thDeviceId.value = ids.includes(thDeviceId.value)
            ? thDeviceId.value
            : (ids.includes(DEFAULT_TH_DEVICE_ID) ? DEFAULT_TH_DEVICE_ID : (ids[0] || ""));
    } catch (e) {
        console.error("loadTHDevices failed:", e);
        thDevices.value = DEFAULT_TH_DEVICE_ID ? [DEFAULT_TH_DEVICE_ID] : [];
        thDeviceId.value = DEFAULT_TH_DEVICE_ID;
    } finally {
        thApiLoading.value = false;
    }
}

async function loadTHLatestDate() {
    const endDay = todaySgtISO();
    const startDay = addDaysISO(endDay, -90);
    const deviceId = thDeviceId.value || thDevices.value[0] || DEFAULT_TH_DEVICE_ID;

    try {
        const points = await fetchTHTimeseries(deviceId, startDay, endDay, 200000);
        let latest = "";
        for (const point of points) {
            const day = isoDateSgt(point.dt);
            if (!latest || day > latest) latest = day;
        }
        thLatestDate.value = latest || todaySgtISO();
    } catch (e) {
        console.error("loadTHLatestDate failed:", e);
        thLatestDate.value = todaySgtISO();
    }
}

async function fetchTHTimeseries(deviceId, startDay, endDay, limit = 5000) {
    const key = `${deviceId}|${startDay}|${endDay}|${limit}`;
    if (thCache.has(key)) return thCache.get(key);

    const url =
        `${TH_TS_URL}?device_id=${encodeURIComponent(deviceId)}` +
        `&start=${encodeURIComponent(startDay)}` +
        `&end=${encodeURIComponent(endDay)}` +
        `&limit=${encodeURIComponent(limit)}`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const items = Array.isArray(data?.items) ? data.items : [];
    

    const points = [];
    for (const item of items) {
        const t = String(item?.hour_bucket_sgt || "").trim();
        const temp = Number(item?.ambient_temperature);
        const hum = Number(item?.relative_humidity);
        if (!t) continue;
        if (!Number.isFinite(temp) || !Number.isFinite(hum)) continue;

        // NOTE: API ts has no timezone; browser treats it as local time, which is fine for SG usage.
        // API ts is UTC without timezone → force UTC, then add +8 hours (SGT)
        const dtSgt = new Date(t);
        if (Number.isNaN(dtSgt.getTime())) continue;

        const dt = new Date(dtSgt.getTime() + SGT_OFFSET_MS);

        points.push({ dt, temp, hum });

    }

    thCache.set(key, points);
    return points;
}

function avg(nums) {
    let s = 0;
    let c = 0;
    for (const x of nums) {
        const v = Number(x);
        if (!Number.isFinite(v)) continue;
        s += v;
        c++;
    }
    return c ? s / c : 0;
}

/** ----- aggregation helpers ----- **/
function groupByKey(points, keyFn) {
    const map = new Map();
    for (const p of points) {
        const k = keyFn(p);
        if (!map.has(k)) map.set(k, []);
        map.get(k).push(p);
    }
    return map;
}

function isoDateSgt(dt) {
    // dt was already shifted to SGT, so use UTC getters to avoid browser timezone interference
    const y = dt.getUTCFullYear();
    const m = String(dt.getUTCMonth() + 1).padStart(2, "0");
    const d = String(dt.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

async function getTHPointsForSelection(startDay, endDay) {
    const deviceId = thDeviceId.value || DEFAULT_TH_DEVICE_ID;
    if (!deviceId) return [];

    try {
        return await fetchTHTimeseries(deviceId, startDay, endDay, 200000);
    } catch (e) {
        console.warn("TH device fetch failed:", deviceId, e);
        return [];
    }

    // merge all devices’ points
}

async function buildTHLineData() {
    const mode = thMode.value;

    // decide start/end
    let startDay = thDate.value;
    let endDay = thDate.value;

    if (mode === "weekly") {
        const startDay = isoWeekToMonday(thWeek.value);   // Monday
        const endDay = endOfWeekISO(startDay);           // Sunday

        // Fetch points across the whole week (still timeseries, but we aggregate by DAY)
        const points = await getTHPointsForSelection(startDay, endDay);

        // Group points by date (SGT)
        const byDay = groupByKey(points, (p) => isoDateSgt(p.dt));

        const days = completedWeekDays(startDay, endDay, thLatestDate.value);
        if (!days.length) {
            return { labels: [], temp: [], hum: [], kpiTemp: 0, kpiHum: 0, hasData: false };
        }

        const labels = [];
        const temp = [];
        const hum = [];

        for (const d of days) {
            const arr = byDay.get(d) || [];
            labels.push(d);
            temp.push(r1(avg(arr.map((x) => x.temp)))); // avg([]) -> 0
            hum.push(r1(avg(arr.map((x) => x.hum))));
        }

        // KPI = average across ALL points in the selected week (or 0 if none)
        const kpiTemp = points.length ? r1(avg(points.map((p) => p.temp))) : 0;
        const kpiHum = points.length ? r1(avg(points.map((p) => p.hum))) : 0;

        return { labels, temp, hum, kpiTemp, kpiHum, hasData: labels.length > 0 };
    }
    else if (mode === "monthly") {
        startDay = monthStartISO(thMonth.value);
        endDay = monthEndISO(thMonth.value);
    }

    const points = await getTHPointsForSelection(startDay, endDay);
    if (!points.length) {
        return {
            labels: [],
            temp: [],
            hum: [],
            kpiTemp: 0,
            kpiHum: 0,
            hasData: false
        };
    }

    // KPI = average across all points in the selected range
    const kpiTemp = r1(avg(points.map((p) => p.temp)));
    const kpiHum = r1(avg(points.map((p) => p.hum)));

    if (mode === "hourly") {
        // bins 0..23
        const bins = Array.from({ length: 24 }, () => ({ temp: [], hum: [] }));
        for (const p of points) {
            const h = p.dt.getUTCHours();
            if (h < 0 || h > 23) continue;
            bins[h].temp.push(p.temp);
            bins[h].hum.push(p.hum);
        }

        const labels = Array.from({ length: 24 }, (_, i) => `${pad2(i)}:00`);
        const tempArr = bins.map((b) => r1(avg(b.temp)));
        const humArr = bins.map((b) => r1(avg(b.hum)));

        const todaySGT = todaySgtISO();
        const curHr = currentHourSgt();

        // If user picked a future date => show nothing
        if (thDate.value > todaySGT) {
            return { labels: [], temp: [], hum: [], kpiTemp: 0, kpiHum: 0, hasData: false };
        }

        // If user picked today => clip to current hour
        if (thDate.value === todaySGT) {
            const endIdx = curHr; // show up to this hour
            return {
                labels: labels.slice(0, endIdx + 1),
                temp: tempArr.slice(0, endIdx + 1),
                hum: humArr.slice(0, endIdx + 1),
                kpiTemp,
                kpiHum,
                hasData: true
            };
        }

        // Past date => show full day
        return { labels, temp: tempArr, hum: humArr, kpiTemp, kpiHum, hasData: true };

    }

    if (mode === "daily") {
        return {
            labels: [thDate.value],
            temp: [Number.isFinite(kpiTemp) ? kpiTemp : 0],
            hum: [Number.isFinite(kpiHum) ? kpiHum : 0],
            kpiTemp: Number.isFinite(kpiTemp) ? kpiTemp : 0,
            kpiHum: Number.isFinite(kpiHum) ? kpiHum : 0,
            hasData: true
        };

    }

    if (mode === "weekly") {
        // group by day
        const byDay = groupByKey(points, (p) => isoDateSgt(p.dt));
        const days = completedWeekDays(startDay, endDay, thLatestDate.value);
        if (!days.length) {
            return { labels: [], temp: [], hum: [], kpiTemp: 0, kpiHum: 0, hasData: false };
        }

        const labels = [];
        const temp = [];
        const hum = [];

        for (const d of days) {
            const arr = byDay.get(d) || [];
            labels.push(d);
            temp.push(r1(avg(arr.map((x) => x.temp))));
            hum.push(r1(avg(arr.map((x) => x.hum))));
        }

        return { labels, temp, hum, kpiTemp, kpiHum, hasData: labels.length > 0 };
    }

    // monthly: Week 1..Week N (same style as your water monthly)
    const weeks = weeksToShowForMonth(thMonth.value);
    if (!weeks.length) return { labels: [], temp: [], hum: [], kpiTemp, kpiHum, hasData: false };

    const byDay = groupByKey(points, (p) => isoDateSgt(p.dt));

    const labels = [];
    const temp = [];
    const hum = [];

    const selected = ymKey(thMonth.value);
    const current = ymKey(currentMonthValSgt());
    const t = todaySgtISO();
    const isCurrentMonth = selected === current;

    for (const w of weeks) {
        const effectiveEnd = isCurrentMonth && w.start <= t && t <= w.end ? t : w.end;
        const days = dateRangeISO(w.start, effectiveEnd);

        const weekTemps = [];
        const weekHums = [];

        for (const d of days) {
            const arr = byDay.get(d) || [];
            for (const p of arr) {
                weekTemps.push(p.temp);
                weekHums.push(p.hum);
            }
        }

        labels.push(w.label);
        temp.push(r1(avg(weekTemps)));
        hum.push(r1(avg(weekHums)));
    }

    return { labels, temp, hum, kpiTemp, kpiHum, hasData: labels.length > 0 };
}

async function buildTHChart() {
    if (!thCanvas.value) return;

    thApiLoading.value = true;

    try {
        const { labels, temp, hum, kpiTemp, kpiHum, hasData } = await buildTHLineData();

        // KPIs (keep both so Summary can switch instantly)
        thKpiTemp.value = kpiTemp;
        thKpiHum.value = kpiHum;

        if (!hasData) openNoDataModal(thMode.value);

        const showTemp = thMetric.value === "overall" || thMetric.value === "temp";
        const showHum = thMetric.value === "overall" || thMetric.value === "hum";

        const datasets = [
            showTemp ? {
                label: "Temperature (°C)",
                data: temp,
                yAxisID: "yTemp",
                tension: 0.25,
                pointRadius: 3,
                borderColor: TEMP_COLOR.line,
                backgroundColor: TEMP_COLOR.fill,
                pointBackgroundColor: TEMP_COLOR.point,
                pointBorderColor: TEMP_COLOR.point,
                fill: true
            } : null,
            showHum ? {
                label: "Humidity (%RH)",
                data: hum,
                yAxisID: "yHum",
                tension: 0.25,
                pointRadius: 3,
                borderColor: HUM_COLOR.line,
                backgroundColor: HUM_COLOR.fill,
                pointBackgroundColor: HUM_COLOR.point,
                pointBorderColor: HUM_COLOR.point,
                fill: true
            } : null
        ].filter(Boolean);


        thChart?.destroy();
        thChart = new Chart(thCanvas.value, {
            type: "line",
            data: { labels, datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: "index", intersect: false },
                scales: {
                    // Only show relevant axis
                    yTemp: showTemp
                        ? { type: "linear", position: showHum ? "right" : "left", title: { display: true, text: "°C" } }
                        : { display: false },

                    yHum: showHum
                        ? {
                            type: "linear",
                            position: "left",
                            min: 0,
                            max: 100,
                            title: { display: true, text: "%RH" },
                            grid: {
                                display: true,        // show guide lines
                                drawBorder: true
                            }
                        }
                        : { display: false }
                }
            }
        });
    } catch (e) {
        console.error("buildTHChart failed:", e);
        thKpiTemp.value = 0;
        thKpiHum.value = 0;
        thChart?.destroy();

        // optional: draw empty chart so UI doesn't look broken
        thChart = new Chart(thCanvas.value, {
            type: "line",
            data: { labels: [], datasets: [] },
            options: { responsive: true, maintainAspectRatio: false }
        });
    } finally {
        thApiLoading.value = false;
    }
}


/** ---- add to unmount ---- **/
onBeforeUnmount(() => {
    thChart?.destroy();
});


/** ---- update mount ---- **/
onMounted(async () => {
    await store.load();
    applyRoleDefaults();
    resolveLatestGasDate();

    await loadWaterDevices();
    resolveLatestWaterDate();
    await loadTHDevices();
    await loadTHLatestDate();
    applyLatestPeriodDefaults();

    await refreshWaterKpis();
    await buildWaterChart();
    await buildTHChart();
    buildGasChart();
});

/** ---- update export PNG ---- **/
function exportSectionPng(utility) {
    const chart =
        utility === "water" ? waterChart :
            utility === "gas" ? gasChart :
                utility === "th" ? thChart :
                    null;

    if (!chart) return;
    const a = document.createElement("a");
    a.href = chart.toBase64Image();
    a.download = `${utility}_${utility === "water" ? waterMode.value : utility === "gas" ? gasMode.value : thMode.value}.png`;
    a.click();
}

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
function addDaysISO(dateStr, days) {
    const [y, m, d] = String(dateStr || "").split("-").map(Number);
    if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return "";

    const dt = new Date(Date.UTC(y, m - 1, d));
    dt.setUTCDate(dt.getUTCDate() + days);
    return dt.toISOString().slice(0, 10);
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
function isoDateToWeekValue(dateStr) {
    const [y, m, d] = String(dateStr || "").split("-").map(Number);
    if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return "";

    const date = new Date(Date.UTC(y, m - 1, d));
    const day = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - day);

    const isoYear = date.getUTCFullYear();
    const yearStart = new Date(Date.UTC(isoYear, 0, 1));
    const weekNo = Math.ceil((((date - yearStart) / 86400000) + 1) / 7);

    return `${isoYear}-W${String(weekNo).padStart(2, "0")}`;
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
    const current = ymKey(currentMonthValSgt());
    const weeks = weeksOfMonthMondayBlocks(monthVal);
    if (weeks.length === 0) return [];

    if (selected < current) return weeks; // past month => show all
    if (selected > current) return []; // future month => show none

    // current month => show weeks up to (and including) the current week
    const t = todaySgtISO();
    return weeks.filter((w) => w.start <= t);
}

function completedDataCutoffISO(latestDate) {
    const today = todaySgtISO();
    if (!latestDate) return addDaysISO(today, -1);
    return latestDate >= today ? addDaysISO(today, -1) : latestDate;
}

function completedWeekDays(start, end, latestDate) {
    const cutoff = completedDataCutoffISO(latestDate);
    if (!cutoff || cutoff < start) return [];

    return dateRangeISO(start, cutoff < end ? cutoff : end);
}

/** ---- store ---- **/
const store = useSiteStore();
const showNoDataModal = ref(false);
const noDataMessage = ref("");

function openNoDataModal(mode) {
    noDataMessage.value = `No data for the selected ${mode} period.`;
    showNoDataModal.value = true;
}

function closeNoDataModal() {
    showNoDataModal.value = false;
}

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
const waterCurrentDate = computed(() => todaySgtISO());
const waterCurrentDisplayDate = computed(() => addDaysISO(todaySgtISO(), -1));
const waterCurrentWeek = computed(() => isoDateToWeekValue(todaySgtISO()));
const waterCurrentMonth = computed(() => currentMonthValSgt());
const waterLatestDate = ref(todaySgtISO());
const waterLatestWeek = computed(() => isoDateToWeekValue(completedDataCutoffISO(waterLatestDate.value)));
const waterLatestMonth = computed(() => (waterLatestDate.value || todaySgtISO()).slice(0, 7));

const WATER_FETCH_LIMIT = 1000;
const waterDailyCache = new Map();

async function fetchWaterDaily(deviceId, startDay, endDay, limit = WATER_FETCH_LIMIT, sort = "desc") {
    const key = `${deviceId}|${startDay}|${endDay}|${limit}|${sort}`;
    if (waterDailyCache.has(key)) {
        console.log("[Water API] cache hit", {
            deviceId,
            startDay,
            endDay,
            limit,
            sort
        });
        return waterDailyCache.get(key);
    }

    const url = `${WATER_DAILY_BASE}/${encodeURIComponent(deviceId)}?start_day=${encodeURIComponent(
        startDay
    )}&end_day=${encodeURIComponent(endDay)}&limit=${encodeURIComponent(limit)}&sort=${encodeURIComponent(sort)}`;

    console.log("[Water API] GET", url, {
        deviceId,
        startDay,
        endDay,
        limit,
        sort
    });
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
        console.log("[Water API] GET", DEVICES_URL);
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
const waterDate = ref(todaySgtISO());
const waterWeek = ref(isoDateToWeekValue(todaySgtISO()));
const waterMonth = ref(currentMonthValSgt());

/** ---- GAS state (existing dataset) ---- **/
const gasMode = ref("weekly");
const gasTenant = ref("");
const gasGateway = ref("");
const gasDate = ref(todaySgtISO());
const gasWeek = ref(isoDateToWeekValue(todaySgtISO()));
const gasMonth = ref(currentMonthValSgt());
const gasLatestDate = ref(todaySgtISO());
const gasLatestWeek = computed(() => isoDateToWeekValue(completedDataCutoffISO(gasLatestDate.value)));
const gasLatestMonth = computed(() => (gasLatestDate.value || todaySgtISO()).slice(0, 7));

/** ---- role defaults ---- **/
function applyRoleDefaults() {
    if (isNormalUser.value) {
        gasTenant.value = lockedTenant.value;
        gasGateway.value = "";
    }
}

function resolveLatestGasDate() {
    let latest = store.meta?.end_date || "";
    for (const row of meterDailyGas.value) {
        if (row?.date && (!latest || row.date > latest)) latest = row.date;
    }
    gasLatestDate.value = latest || todaySgtISO();
}

function resolveLatestWaterDate() {
    let latest = "";
    for (const device of waterDevices.value || []) {
        const day = String(device?.updated_at || device?.last_seen_at || "").slice(0, 10);
        if (day && (!latest || day > latest)) latest = day;
    }
    waterLatestDate.value = latest || todaySgtISO();
}

function applyLatestPeriodDefaults() {
    thDate.value = thLatestDate.value;
    thWeek.value = thLatestWeek.value;
    thMonth.value = thLatestMonth.value;

    waterDate.value = waterCurrentDisplayDate.value;
    waterWeek.value = waterCurrentWeek.value;
    waterMonth.value = waterCurrentMonth.value;

    gasDate.value = gasLatestDate.value;
    gasWeek.value = gasLatestWeek.value;
    gasMonth.value = gasLatestMonth.value;
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

// Gateway UI placeholder (same pattern as Water; API doesn't use it)
const TH_DEFAULT_GATEWAY_ID = "647fdafffe01f876";
const thGateway = ref("");

const thMetric = ref("overall"); // "overall" | "temp" | "hum"


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

const waterKpiCumulative = ref(0);      // latest dispNum
const waterKpiCumulativeTs = ref("");   // latest timestamp label

async function refreshWaterKpis() {
    try {
        const isAll = !waterDeviceId.value;

        // reset cumulative
        waterKpiCumulative.value = 0;
        waterKpiCumulativeTs.value = "";

        // Daily + Hourly + CUMULATIVE
        if (isAll) {
            // Daily usage (sum across tenants)
            const map = await getUsageMapAllTenants(waterDate.value, waterDate.value);
            waterKpiDaily.value = r1(map.get(waterDate.value) || 0);

            // Hourly usage (sum across tenants)
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

            // Cumulative (Latest): sum of each device's latest dispNum (using a 7-day window)
            // (We use a small window because “latest” might be not today.)
            const end = todaySgtISO();
            const start = (() => {
                const d = new Date(end);
                d.setDate(d.getDate() - 7);
                return d.toISOString().slice(0, 10);
            })();

            const latestPerDevice = await Promise.all(
                ids.map(async (id) => {
                    try {
                        const arr = await fetchWaterDaily(id, start, end, WATER_FETCH_LIMIT, "desc");
                        const latest = latestCumulativeFromDailyRows(arr);
                        return latest.value;
                    } catch {
                        return 0;
                    }
                })
            );

            waterKpiCumulative.value = r1(latestPerDevice.reduce((a, b) => a + Number(b || 0), 0));
            waterKpiCumulativeTs.value = "Latest";

        } else {
            // Selected device only

            // Daily usage
            waterKpiDaily.value = await getWaterDailyUsage(waterDeviceId.value, waterDate.value);

            // Hourly usage (sum of hour buckets)
            const arr = await fetchWaterDaily(waterDeviceId.value, waterDate.value, waterDate.value);
            const row = arr?.find((x) => x?.day === waterDate.value) || arr?.[0];
            const buckets = hourlyUsageBuckets(row?.readings || []);
            waterKpiHourly.value = r1(buckets.reduce((a, b) => a + Number(b || 0), 0));

            // Cumulative (Latest) for this device (use last 7 days window)
            const end = todaySgtISO();
            const start = (() => {
                const d = new Date(end);
                d.setDate(d.getDate() - 7);
                return d.toISOString().slice(0, 10);
            })();

            const rows = await fetchWaterDaily(waterDeviceId.value, start, end, WATER_FETCH_LIMIT, "desc");
            const latest = latestCumulativeFromDailyRows(rows);

            waterKpiCumulative.value = latest.value;
            waterKpiCumulativeTs.value = latest.label || "—";
        }

        // Weekly KPI
        {
            const start = isoWeekToMonday(waterWeek.value);
            const end = endOfWeekISO(start);
            const days = completedWeekDays(start, end, waterLatestDate.value);

            const dayToUsage = isAll
                ? await getUsageMapAllTenants(start, end)
                : await fetchUsageMapForDevice(waterDeviceId.value, start, end);

            let total = 0;
            for (const d of days) total += Number(dayToUsage.get(d) || 0);
            waterKpiWeekly.value = r1(total);
        }
    } catch (e) {
        console.error("refreshWaterKpis failed:", e);
        waterKpiDaily.value = 0;
        waterKpiWeekly.value = 0;
        waterKpiHourly.value = 0;
        waterKpiCumulative.value = 0;
        waterKpiCumulativeTs.value = "";
    }
}


/** ---- GAS KPIs ---- **/
const gasKpiDaily = computed(() => {
    const dates = new Set([gasDate.value]);
    return sumConsumption(filterRowsGas({ utility: "gas", tenant: gasTenant.value, gateway: gasGateway.value, dates }));
});
const gasKpiWeekly = computed(() => {
    const start = isoWeekToMonday(gasWeek.value);
    const days = completedWeekDays(start, endOfWeekISO(start), gasLatestDate.value);
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

function parseReadingTsToMs(tStr, dayStr) {
    // readings.t is typically "HH:mm:ss" (sometimes with ms). Build a sortable timestamp.
    // We treat it as SGT-ish display time (same as your other logic).
    if (!tStr || !dayStr) return -Infinity;

    const t = String(tStr);
    const hh = Number(t.slice(0, 2));
    const mm = Number(t.slice(3, 5));
    const ss = Number(t.slice(6, 8));

    if (!Number.isFinite(hh) || !Number.isFinite(mm) || !Number.isFinite(ss)) return -Infinity;

    // Use Date.UTC to avoid local timezone messing with ordering
    const [y, m, d] = dayStr.split("-").map(Number);
    if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return -Infinity;

    return Date.UTC(y, m - 1, d, hh, mm, ss);
}

function formatDayTime(dayStr, tStr) {
    if (!dayStr || !tStr) return "";
    return `${dayStr} ${String(tStr).slice(0, 5)}`; // "YYYY-MM-DD HH:mm"
}

function latestCumulativeFromDailyRows(dailyRows) {
    // dailyRows: array returned by /daily/{device}?start_day=...&end_day=...
    // Each row has { day, readings: [{t, dispNum}, ...] }
    let bestMs = -Infinity;
    let bestVal = 0;
    let bestLabel = "";

    for (const row of dailyRows || []) {
        const day = row?.day;
        const readings = Array.isArray(row?.readings) ? row.readings : [];
        for (const r of readings) {
            const v = Number(r?.dispNum);
            if (!Number.isFinite(v)) continue;

            const ms = parseReadingTsToMs(r?.t, day);
            if (ms > bestMs) {
                bestMs = ms;
                bestVal = v;
                bestLabel = formatDayTime(day, r?.t);
            }
        }
    }

    return { value: r1(bestVal), label: bestLabel };
}

async function buildWaterCumulativeSeries() {
    const mode = waterMode.value;
    const isAll = !waterDeviceId.value;

    // Utility: get daily rows for a single device over a range
    async function getRows(deviceId, startDay, endDay) {
        return await fetchWaterDaily(deviceId, startDay, endDay, WATER_FETCH_LIMIT, "desc");
    }

    if (mode === "hourly") {
        const labels = Array.from({ length: 24 }, (_, i) => `${pad2(i)}:00`);

        if (isAll) {
            const ids = (waterDevices.value || []).map((d) => d.device_id).filter(Boolean);
            const perDevice = await Promise.all(
                ids.map(async (id) => {
                    try {
                        const arr = await getRows(id, waterDate.value, waterDate.value);
                        const row = arr?.find((x) => x?.day === waterDate.value) || arr?.[0];
                        return cumulativeHourlyFromReadings(row?.readings || [], waterDate.value);
                    } catch {
                        return Array(24).fill(0);
                    }
                })
            );

            const summed = Array(24).fill(0);
            for (const series of perDevice) {
                for (let i = 0; i < 24; i++) summed[i] += Number(series?.[i] || 0);
            }

            return { labels, cumulative: summed.map(r1) };
        }

        const arr = await getRows(waterDeviceId.value, waterDate.value, waterDate.value);
        const row = arr?.find((x) => x?.day === waterDate.value) || arr?.[0];
        return { labels, cumulative: cumulativeHourlyFromReadings(row?.readings || [], waterDate.value) };
    }

    if (mode === "daily") {
        if (isAll) {
            const ids = (waterDevices.value || []).map((d) => d.device_id).filter(Boolean);
            const latestVals = await Promise.all(
                ids.map(async (id) => {
                    try {
                        const arr = await getRows(id, waterDate.value, waterDate.value);
                        const row = arr?.find((x) => x?.day === waterDate.value) || arr?.[0];
                        return latestReadingInDay(row?.readings || [], waterDate.value).value;
                    } catch {
                        return 0;
                    }
                })
            );
            return { labels: [waterDate.value], cumulative: [r1(latestVals.reduce((a, b) => a + Number(b || 0), 0))] };
        }

        const arr = await getRows(waterDeviceId.value, waterDate.value, waterDate.value);
        const row = arr?.find((x) => x?.day === waterDate.value) || arr?.[0];
        const latest = latestReadingInDay(row?.readings || [], waterDate.value).value;
        return { labels: [waterDate.value], cumulative: [r1(latest)] };
    }

    if (mode === "weekly") {
        const start = isoWeekToMonday(waterWeek.value);
        const end = endOfWeekISO(start);
        const days = dateRangeISO(start, end);

        if (isAll) {
            const ids = (waterDevices.value || []).map((d) => d.device_id).filter(Boolean);
            const deviceMaps = await Promise.all(
                ids.map(async (id) => {
                    const m = new Map();
                    try {
                        const arr = await getRows(id, start, end);
                        for (const day of days) {
                            const row = arr?.find((x) => x?.day === day);
                            const v = latestReadingInDay(row?.readings || [], day).value;
                            m.set(day, v);
                        }
                    } catch {
                        for (const day of days) m.set(day, 0);
                    }
                    return m;
                })
            );

            const cumulative = days.map((day) => {
                let sum = 0;
                for (const m of deviceMaps) sum += Number(m.get(day) || 0);
                return r1(sum);
            });

            return { labels: days, cumulative };
        }

        const arr = await getRows(waterDeviceId.value, start, end);
        const cumulative = days.map((day) => {
            const row = arr?.find((x) => x?.day === day);
            return r1(latestReadingInDay(row?.readings || [], day).value);
        });

        return { labels: days, cumulative };
    }

    // monthly (same labels as your water monthly: Week 1..Week N)
    const weeks = weeksToShowForMonth(waterMonth.value);
    if (!weeks.length) return { labels: [], cumulative: [] };

    const monthStart = monthStartISO(waterMonth.value);
    const monthEnd = monthEndISO(waterMonth.value);

    const selected = ymKey(waterMonth.value);
    const current = ymKey(currentMonthValSgt());
    const t = todaySgtISO();
    const isCurrentMonth = selected === current;

    if (isAll) {
        const ids = (waterDevices.value || []).map((d) => d.device_id).filter(Boolean);

        const latestPerDevicePerWeek = await Promise.all(
            ids.map(async (id) => {
                const out = [];
                try {
                    const arr = await getRows(id, monthStart, monthEnd);
                    for (const w of weeks) {
                        const effectiveEnd = isCurrentMonth && w.start <= t && t <= w.end ? t : w.end;

                        // pick latest reading within that week range (across days)
                        let best = { value: 0, ms: -Infinity };
                        const days = dateRangeISO(w.start, effectiveEnd);
                        for (const day of days) {
                            const row = arr?.find((x) => x?.day === day);
                            const latest = latestReadingInDay(row?.readings || [], day);
                            if (latest.ms > best.ms) best = { value: latest.value, ms: latest.ms };
                        }
                        out.push(best.value);
                    }
                } catch {
                    for (let i = 0; i < weeks.length; i++) out.push(0);
                }
                return out;
            })
        );

        const cumulative = weeks.map((_, i) => {
            let sum = 0;
            for (const arr of latestPerDevicePerWeek) sum += Number(arr?.[i] || 0);
            return r1(sum);
        });

        return { labels: weeks.map((w) => w.label), cumulative };
    }

    const arr = await getRows(waterDeviceId.value, monthStart, monthEnd);
    const cumulative = weeks.map((w) => {
        const effectiveEnd = isCurrentMonth && w.start <= t && t <= w.end ? t : w.end;

        let best = { value: 0, ms: -Infinity };
        const days = dateRangeISO(w.start, effectiveEnd);
        for (const day of days) {
            const row = arr?.find((x) => x?.day === day);
            const latest = latestReadingInDay(row?.readings || [], day);
            if (latest.ms > best.ms) best = { value: latest.value, ms: latest.ms };
        }

        return r1(best.value);
    });

    return { labels: weeks.map((w) => w.label), cumulative };
}

/** ---- WATER chart data ---- **/
async function buildWaterBarData() {
    const mode = waterMode.value;
    if (!waterDevices.value?.length) return { labels: [], values: [], hasData: false };
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
                        return {
                            hasData: !!row,
                            values: hourlyUsageBuckets(row?.readings || [])
                        };
                    } catch (e) {
                        console.warn("Hourly device failed:", id, e);
                        return { hasData: false, values: Array(24).fill(0) };
                    }
                })
            );

            const summed = Array(24).fill(0);
            for (const buckets of perDeviceBuckets) {
                for (let i = 0; i < 24; i++) summed[i] += Number(buckets?.values?.[i] || 0);
            }

            const values = summed.map(r1);
            return { labels, values, hasData: perDeviceBuckets.some((b) => b.hasData) };
        }

        const arr = await fetchWaterDaily(waterDeviceId.value, waterDate.value, waterDate.value);
        const row = arr?.find((x) => x?.day === waterDate.value) || arr?.[0];
        const values = hourlyUsageBuckets(row?.readings || []);
        return { labels, values, hasData: !!row };
    }

    if (mode === "daily") {
        if (isAll) {
            const map = await getUsageMapAllTenants(waterDate.value, waterDate.value);
            const v = r1(map.get(waterDate.value) || 0);
            return { labels: [waterDate.value], values: [v], hasData: map.has(waterDate.value) };
        }

        const v = await getWaterDailyUsage(waterDeviceId.value, waterDate.value);
        const map = await fetchUsageMapForDevice(waterDeviceId.value, waterDate.value, waterDate.value);
        return { labels: [waterDate.value], values: [v], hasData: map.has(waterDate.value) };
    }

    if (mode === "weekly") {
        const start = isoWeekToMonday(waterWeek.value);
        const end = endOfWeekISO(start);

        const dayToUsage = isAll
            ? await getUsageMapAllTenants(start, end)
            : await fetchUsageMapForDevice(waterDeviceId.value, start, end);

        const days = completedWeekDays(start, end, waterLatestDate.value);
        const labels = [];
        const values = [];
        for (const d of days) {
            labels.push(d);
            values.push(r1(dayToUsage.get(d) || 0));
        }

        return { labels, values, hasData: days.some((d) => dayToUsage.has(d)) };
    }

    // Monthly: Week 1..Week N (include current week); partial-sum current week up to today
    const weeks = weeksToShowForMonth(waterMonth.value);
    if (weeks.length === 0) return { labels: [], values: [], hasData: false };

    const monthStart = monthStartISO(waterMonth.value);
    const monthEnd = monthEndISO(waterMonth.value);

    const dayToUsage = isAll
        ? await getUsageMapAllTenants(monthStart, monthEnd)
        : await fetchUsageMapForDevice(waterDeviceId.value, monthStart, monthEnd);

    const labels = [];
    const values = [];

    const selected = ymKey(waterMonth.value);
    const current = ymKey(currentMonthValSgt());
    const t = todaySgtISO();
    const isCurrentMonth = selected === current;
    let hasData = false;

    for (const w of weeks) {
        const effectiveEnd = isCurrentMonth && w.start <= t && t <= w.end ? t : w.end;
        const days = dateRangeISO(w.start, effectiveEnd);

        let sum = 0;
        for (const d of days) {
            if (dayToUsage.has(d)) hasData = true;
            sum += Number(dayToUsage.get(d) || 0);
        }

        labels.push(w.label);
        values.push(r1(sum));
    }

    return { labels, values, hasData };
}

/** ---- GAS chart data (existing) ---- **/
function buildGasBarData({ utility, mode, tenant, gateway, date, week, month }) {
    const labels = [];
    const values = [];
    let hasData = false;

    if (mode === "daily") {
        const rows = filterRowsGas({ utility, tenant, gateway, dates: new Set([date]) });
        labels.push(date);
        values.push(sumConsumption(rows));
        hasData = rows.length > 0;
    }

    if (mode === "weekly") {
        const start = isoWeekToMonday(week);
        const days = completedWeekDays(start, endOfWeekISO(start), gasLatestDate.value);

        for (const d of days) {
            const rows = filterRowsGas({ utility, tenant, gateway, dates: new Set([d]) });
            labels.push(d);
            values.push(sumConsumption(rows));
            if (rows.length) hasData = true;
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
            if (rows.length) hasData = true;
        }
    }

    return { labels, values, hasData };
}

/** ---- chart builders ---- **/
async function buildWaterChart() {
    if (!waterCanvas.value) return;

    waterApiLoading.value = true;
    try {
        const { labels, values, hasData } = await buildWaterBarData();

        if (!hasData) openNoDataModal(waterMode.value);

        waterChart?.destroy();
        waterChart = new Chart(waterCanvas.value, {
            type: "bar",
            data: {
                labels,
                datasets: [
                    {
                        label: "Water (m³)",
                        data: values,
                        backgroundColor: "rgba(56, 142, 60, 0.6)", // green fill
                        borderColor: "rgba(56, 142, 60, 1)",       // green border
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    } catch (e) {
        console.error("buildWaterChart failed:", e);
        waterChart?.destroy();
        waterChart = new Chart(waterCanvas.value, {
            type: "bar",
            data: {
                labels: [],
                datasets: [
                    {
                        label: "Water (m³)",
                        data: [],
                        backgroundColor: "rgba(56, 142, 60, 0.6)",
                        borderColor: "rgba(56, 142, 60, 1)",
                        borderWidth: 1
                    }
                ]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    } finally {
        waterApiLoading.value = false;
    }
}


function buildGasChart() {
    if (!gasCanvas.value) return;

    const { labels, values, hasData } = buildGasBarData({
        utility: "gas",
        mode: gasMode.value,
        tenant: gasTenant.value,
        gateway: gasGateway.value,
        date: gasDate.value,
        week: gasWeek.value,
        month: gasMonth.value
    });

    if (!hasData) openNoDataModal(gasMode.value);

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
    if (utility === "th") {
        const { labels, temp, hum } = await buildTHLineData();
        const out = labels.map((p, i) => ({
            utility: "temp_humidity",
            mode: thMode.value,
            device: thDeviceId.value || "ALL",
            period: p,
            temperature_c: temp[i],
            humidity_rh: hum[i]
        }));
        exportToCsv(`temp_humidity_${thMode.value}_${thDeviceId.value || "ALL"}.csv`, out);
        return;
    }

    if (utility === "water") {
        const { labels, values } = await buildWaterBarData();
        const { cumulative } = await buildWaterCumulativeSeries();

        const out = labels.map((p, i) => ({
            utility: "water",
            mode: waterMode.value,
            tenant: waterDeviceId.value || "ALL",
            gateway: waterGateway.value || "ALL",
            period: p,
            m3: values[i],
            cumulative_m3: cumulative?.[i] ?? 0
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

function printPage() {
    window.print();
}

watch(
    [thMode, thDeviceId, thGateway, thMetric, thDate, thWeek, thMonth],
    async () => {
        await buildTHChart();
    }
);

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

.fullWidth {
    width: 100%;
}

.thChartWrap {
    height: 300px;
    /* tweak if you want bigger */
}

/* TH: force filters into ONE row */
.fullWidth .filters {
    grid-template-columns: repeat(6, minmax(0, 1fr));
    align-items: end;
}

/* Make "Summary" look nice even if it needs more space */
.fullWidth .filters .filter:last-child .input {
    white-space: nowrap;
}

/* Responsive: 3 per row on medium screens */
@media (max-width: 1400px) {
    .fullWidth .filters {
        grid-template-columns: repeat(3, minmax(0, 1fr));
    }
}

/* Responsive: 2 per row on smaller screens */
@media (max-width: 900px) {
    .fullWidth .filters {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }
}

.sectionKpis.waterKpis4 {
    grid-template-columns: repeat(4, 1fr);
}

.modalBackdrop {
    position: fixed;
    inset: 0;
    background: rgba(47, 53, 66, 0.45);
    display: grid;
    place-items: center;
    padding: 16px;
    z-index: 1000;
}

.modalCard {
    width: min(420px, 100%);
    background: #fff;
    border-radius: 16px;
    padding: 20px;
    border: 1px solid #e1e4ea;
    box-shadow: 0 18px 40px rgba(47, 53, 66, 0.18);
}

.modalTitle {
    font-size: 20px;
    font-weight: 800;
    color: #2f3542;
}

.modalText {
    margin-top: 10px;
    color: #5b6474;
    line-height: 1.5;
}

.modalActions {
    display: flex;
    justify-content: flex-end;
    margin-top: 16px;
}

@media (max-width: 1200px) {
    .sectionKpis.waterKpis4 {
        grid-template-columns: repeat(2, 1fr);
    }
}
</style>
