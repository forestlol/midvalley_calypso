<template>
    <div v-if="store.loading">Loading…</div>
    <div v-else-if="store.error" class="err">Error: {{ store.error }}</div>

    <div v-else class="wrap">
        <div class="card">
            <div class="title">Alarms</div>

            <div class="controls">
                <select v-model="type" class="input">
                    <option value="">All Types</option>
                    <option value="GATEWAY_OFFLINE">Gateway Offline</option>
                    <option value="LOW_SIGNAL">Low Signal</option>
                    <option value="THRESHOLD_EXCEEDED">Consumption Threshold</option>
                </select>

                <button class="btn" @click="window.print()">Print</button>
                <button class="btn" @click="exportCsv">Export CSV</button>
            </div>
        </div>

        <div class="card">
            <table class="table">
                <thead>
                    <tr>
                        <th class="col-date">Date</th>
                        <th class="col-type">Type</th>
                        <th class="col-target">Target</th>
                        <th class="col-details">Details</th>
                    </tr>
                </thead>

                <tbody>
                    <tr v-for="(a, idx) in filtered" :key="idx">
                        <td class="col-date">{{ a.date }}</td>
                        <td class="col-type">{{ a.type }}</td>
                        <td class="col-target">{{ a.target }}</td>
                        <td class="col-details">{{ a.details }}</td>
                    </tr>

                    <tr v-if="filtered.length === 0">
                        <td colspan="4" class="empty">No alarms for this filter.</td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { useSiteStore } from "../stores/siteStore";
import { useAuth } from "../stores/auth";
import { exportToCsv } from "../utils/exportCsv";
import { getYesterday, syntheticGasDaily } from "../utils/agg";

const store = useSiteStore();
const type = ref("");

/** ---- auth scope ---- **/
const { userRole, tenantName } = useAuth();
const role = computed(() => userRole?.value || "normal_user");
const isNormalUser = computed(() => role.value === "normal_user");
const lockedTenant = computed(() => tenantName?.value || "BOOKSTORE");

onMounted(() => store.load());

/**
 * Build a set of gateway_ids that belong to the tenant (based on meter_daily)
 * This is how we filter gateway alarms for normal users.
 */
const tenantGatewaySet = computed(() => {
    if (!isNormalUser.value) return null;

    const set = new Set();
    const rows = store.raw?.meter_daily || [];
    for (const r of rows) {
        if (!r) continue;
        if (r.tenant !== lockedTenant.value) continue;
        if (r.gateway_id) set.add(r.gateway_id);
    }
    return set;
});

const alarms = computed(() => {
    const out = [];

    // ---- 1) gateway alarms from dataset ----
    for (const row of store.gatewayDaily || []) {
        if (!row?.gateway_id || !row?.date) continue;

        // normal user: only include alarms from gateways tied to their tenant
        if (isNormalUser.value) {
            const set = tenantGatewaySet.value;
            if (set && !set.has(row.gateway_id)) continue;
        }

        // raw alarms list
        for (const a of row.alarms || []) {
            out.push({
                date: row.date,
                type: a,
                target: row.gateway_id,
                details: `zone=${row.zone}, rssi=${row.rssi_dbm}, online=${row.online}`,
            });
        }

        // gateway offline
        if (row.online === false) {
            out.push({
                date: row.date,
                type: "GATEWAY_OFFLINE",
                target: row.gateway_id,
                details: `zone=${row.zone}, rssi=${row.rssi_dbm}`,
            });
        }

        // low signal
        if (typeof row.rssi_dbm === "number" && row.rssi_dbm < -90) {
            out.push({
                date: row.date,
                type: "LOW_SIGNAL",
                target: row.gateway_id,
                details: `zone=${row.zone}, rssi=${row.rssi_dbm}`,
            });
        }
    }

    // ---- 2) threshold exceeded (yesterday per tenant) ----
    const yday = getYesterday();

    // normal user: only compute for their tenant
    if (isNormalUser.value) {
        let total = 0;
        for (const m of store.gasMeters || []) {
            if (m.tenant !== lockedTenant.value) continue;
            total += syntheticGasDaily(m.meter_id, yday);
        }

        const thr =
            store.gasDailyThresholdByTenant?.[lockedTenant.value] ??
            store.gasDailyThresholdByTenant?.DEFAULT ??
            80;

        if (total > thr) {
            out.push({
                date: yday,
                type: "THRESHOLD_EXCEEDED",
                target: lockedTenant.value,
                details: `yesterday=${Math.round(total * 10) / 10}m³ > threshold=${thr}m³`,
            });
        }
    } else {
        // admin: all tenants
        const byTenant = new Map();
        for (const m of store.gasMeters || []) {
            byTenant.set(m.tenant, (byTenant.get(m.tenant) || 0) + syntheticGasDaily(m.meter_id, yday));
        }

        for (const [tenant, val] of byTenant.entries()) {
            const thr =
                store.gasDailyThresholdByTenant?.[tenant] ??
                store.gasDailyThresholdByTenant?.DEFAULT ??
                80;

            if (val > thr) {
                out.push({
                    date: yday,
                    type: "THRESHOLD_EXCEEDED",
                    target: tenant,
                    details: `yesterday=${Math.round(val * 10) / 10}m³ > threshold=${thr}m³`,
                });
            }
        }
    }

    out.sort((a, b) => b.date.localeCompare(a.date) || a.type.localeCompare(b.type));
    return out;
});

const filtered = computed(() => {
    if (!type.value) return alarms.value;
    return alarms.value.filter((a) => a.type === type.value);
});

function exportCsv() {
    exportToCsv(`alarms_${type.value || "all"}.csv`, filtered.value);
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

.table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
    table-layout: auto;
    /* ✅ default, content-based */
}

th,
td {
    padding: 10px 10px;
    border-bottom: 1px solid #edf0f5;
    text-align: left;
    color: #2f3542;
    vertical-align: top;
    overflow-wrap: anywhere;
    /* ✅ prevents layout breaking */
}


.empty {
    text-align: center;
    color: #8a94a6;
    padding: 18px 10px;
}

.err {
    color: #e55353;
}
</style>
