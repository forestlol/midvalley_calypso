<template>
    <div class="page">
        <!-- HEADER -->
        <div class="topbar">
            <div class="titleBlock">
                <h2 class="title">KonaMicro Latest</h2>
                <div class="sub">
                    Status is OFFLINE if last update is older than 1 hour (device timestamps shown as UTC+8).
                </div>
            </div>

            <div class="controls">
                <!-- Only refresh button styled -->
                <button class="refreshBtn" @click="refreshAll" :disabled="loadingAny">
                    {{ loadingAny ? "Refreshing…" : "Refresh All" }}
                </button>

                <label class="poll">
                    <input type="checkbox" v-model="pollEnabled" />
                    Auto refresh
                </label>

                <select class="select" v-model.number="pollMs" :disabled="!pollEnabled">
                    <option :value="5000">5s</option>
                    <option :value="10000">10s</option>
                    <option :value="30000">30s</option>
                    <option :value="60000">60s</option>
                </select>
            </div>
        </div>

        <!-- TABLE -->
        <div class="card">
            <div class="cardHeader">
                <h3>Readings</h3>
                <div class="meta">
                    Rows: {{ rows.length }}
                    <span v-if="lastRefreshedAt">| Last refresh: {{ lastRefreshedAt }}</span>
                </div>
            </div>

            <div class="tableWrap">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Device ID</th>
                            <th>Timestamp (UTC+8)</th>
                            <th>Battery (V)</th>
                            <th>RSSI</th>
                            <th>Gateway</th>
                            <th>FCount</th>
                            <th>Status</th>
                            <th style="width:110px">Actions</th>
                        </tr>
                    </thead>

                    <tbody>
                        <tr v-for="row in rows" :key="row.deviceId">
                            <td class="mono">{{ row.deviceId }}</td>
                            <td>{{ row.timestampUtc8 || "-" }}</td>
                            <td>{{ row.batteryV ?? "-" }}</td>
                            <td>{{ row.rssi ?? "-" }}</td>
                            <td class="mono">{{ row.gateway || "-" }}</td>
                            <td>{{ row.fCount ?? "-" }}</td>
                            <td>
                                <span class="status" :class="row.online ? 'online' : 'offline'">
                                    {{ row.online ? "ONLINE" : "OFFLINE" }}
                                </span>
                            </td>
                            <td>
                                <button class="btnPlain" @click="refreshOne(row.deviceId)" :disabled="row.loading">
                                    {{ row.loading ? "…" : "Refresh" }}
                                </button>
                            </td>
                        </tr>

                        <tr v-if="rows.length === 0">
                            <td colspan="8" class="empty">No devices configured.</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- GATEWAYS -->
        <div class="grid2">
            <div class="card">
                <div class="cardHeader">
                    <h3>Add Gateway (Future)</h3>
                </div>

                <div class="form">
                    <div class="field">
                        <label>Gateway ID</label>
                        <input class="input" v-model="newGatewayId" />
                    </div>

                    <div class="field">
                        <label>Notes</label>
                        <input class="input" v-model="newGatewayNote" />
                    </div>

                    <button class="btnPlain" @click="addGatewayLocal">
                        Add (local)
                    </button>
                </div>
            </div>

            <div class="card">
                <div class="cardHeader">
                    <h3>Remove Gateway</h3>
                    <div class="meta">Saved: {{ gateways.length }}</div>
                </div>

                <div v-if="gateways.length === 0" class="empty">
                    No gateways saved.
                </div>

                <div v-else class="gatewayList">
                    <div class="gatewayItem" v-for="gw in gateways" :key="gw.id">
                        <span class="mono">{{ gw.id }}</span>
                        <button class="btnPlain danger" @click="removeGatewayLocal(gw.id)">
                            Remove
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { computed, onMounted, onBeforeUnmount, reactive, ref, watch } from "vue";
import axios from "axios";

const API = "https://midvalley-temperature.rshare.io/api/konamicro/latest";

const deviceIds = ref(["647FDA00000171B0"]);
const rowMap = reactive({});

const pollEnabled = ref(true);
const pollMs = ref(10000);
let pollTimer = null;

const lastRefreshedAt = ref(null);

// gateways (local only)
const gateways = ref([]);
const newGatewayId = ref("");
const newGatewayNote = ref("");

function addGatewayLocal() {
    if (!newGatewayId.value) return;
    gateways.value.push({ id: newGatewayId.value, note: newGatewayNote.value });
    newGatewayId.value = "";
    newGatewayNote.value = "";
}

function removeGatewayLocal(id) {
    gateways.value = gateways.value.filter((g) => g.id !== id);
}

// helpers
function ensureRow(deviceId) {
    if (!rowMap[deviceId]) {
        rowMap[deviceId] = {
            deviceId,
            loading: false,
            tsUtc: null,
            timestampUtc8: null,
            batteryV: null,
            rssi: null,
            gateway: null,
            fCount: null,
            online: false,
        };
    }
    return rowMap[deviceId];
}

function formatUtcPlus8(dateObj) {
    if (!dateObj) return null;
    const d = new Date(dateObj);
    d.setHours(d.getHours() + 8);
    return d.toLocaleString("en-SG", {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
    });
}

/**
 * LAST REFRESH = local browser time (no offset)
 */
function formatLocalNow() {
    return new Date().toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
    });
}

function parseRow(payload) {
    const decoded = payload.decoded || {};
    const meta = payload.meta || {};
    const raw = payload.raw_values || {};

    const ts = payload.ts_utc || payload.ingested_at;
    const tsUtc = ts ? new Date(ts) : null;

    const ONE_HOUR = 60 * 60 * 1000;
    const online = tsUtc ? Date.now() - tsUtc.getTime() <= ONE_HOUR : false;

    return {
        tsUtc,
        timestampUtc8: formatUtcPlus8(tsUtc),
        batteryV: decoded.battery_v ?? null,
        rssi: meta.nsRssi ?? raw.nsRssi ?? null,
        gateway: meta.nsGateway ?? raw.nsGateway ?? null,
        fCount: meta.nsFCount ?? raw.nsFCount ?? null,
        online,
    };
}

// API
async function refreshOne(deviceId) {
    const row = ensureRow(deviceId);
    row.loading = true;

    try {
        const res = await axios.get(API, { params: { device_id: deviceId } });
        Object.assign(row, parseRow(res.data));
    } catch {
        row.online = false;
    } finally {
        row.loading = false;
    }
}

async function refreshAll() {
    await Promise.all(deviceIds.value.map(refreshOne));
    lastRefreshedAt.value = formatLocalNow();
}

// polling
function startPolling() {
    stopPolling();
    pollTimer = setInterval(refreshAll, pollMs.value);
}

function stopPolling() {
    if (pollTimer) clearInterval(pollTimer);
}

watch([pollEnabled, pollMs], () => {
    pollEnabled.value ? startPolling() : stopPolling();
});

const rows = computed(() => deviceIds.value.map(ensureRow));
const loadingAny = computed(() => rows.value.some((r) => r.loading));

onMounted(() => {
    deviceIds.value.forEach(ensureRow);
    refreshAll();
    if (pollEnabled.value) startPolling();
});

onBeforeUnmount(stopPolling);
</script>

<style scoped>
.page {
    padding: 16px;
    display: grid;
    gap: 16px;
}

.topbar {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    flex-wrap: wrap;
    gap: 12px;
}

.title {
    margin: 0;
    font-size: 20px;
}

.sub {
    font-size: 13px;
    opacity: 0.75;
    margin-top: 4px;
}

.controls {
    display: flex;
    align-items: center;
    gap: 10px;
}

.refreshBtn {
    padding: 8px 14px;
    border-radius: 10px;
    border: 1px solid #ccc;
    background: #f3f3f3;
    cursor: pointer;
}

.refreshBtn:hover {
    background: #e9e9e9;
}

.refreshBtn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.poll {
    font-size: 13px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
}

.select {
    padding: 6px 8px;
}

.card {
    background: #fff;
    border: 1px solid #ddd;
    border-radius: 12px;
    padding: 14px;
}

.cardHeader {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
}

.meta {
    font-size: 12px;
    opacity: 0.7;
}

.tableWrap {
    overflow-x: auto;
}

.table {
    width: 100%;
    border-collapse: collapse;
    min-width: 850px;
}

.table th,
.table td {
    padding: 10px 12px;
    border-bottom: 1px solid #eee;
    text-align: left;
    font-size: 13px;
}

.table th {
    background: #f7f7f7;
}

.mono {
    font-family: monospace;
}

.status {
    padding: 3px 10px;
    border-radius: 999px;
    font-size: 12px;
}

.status.online {
    background: #e6f6ee;
    color: #1e7f4a;
}

.status.offline {
    background: #fdeaea;
    color: #a02323;
}

.btnPlain {
    padding: 6px 10px;
    border-radius: 8px;
    border: 1px solid #ccc;
    background: #fafafa;
    cursor: pointer;
}

.btnPlain:hover {
    background: #f0f0f0;
}

.btnPlain.danger {
    color: #a02323;
    border-color: #e0b4b4;
}

.grid2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
}

@media (max-width: 900px) {
    .grid2 {
        grid-template-columns: 1fr;
    }
}

.form {
    display: grid;
    grid-template-columns: 1fr 1fr auto;
    gap: 10px;
    align-items: end;
}

.field label {
    font-size: 12px;
    display: block;
    margin-bottom: 4px;
}

.input {
    width: 100%;
    padding: 6px 8px;
}

.gatewayList {
    display: grid;
    gap: 8px;
}

.gatewayItem {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.empty {
    font-size: 13px;
    opacity: 0.7;
    padding: 8px 0;
}
</style>
