<template>
    <div class="wrap">
        <div class="card">
            <div class="title">Add Gateway</div>
            <div class="grid">
                <input v-model="g.gateway_id" class="input" placeholder="Gateway ID (e.g. GW-MV-L4-01)" />
                <input v-model="g.zone" class="input" placeholder="Zone (e.g. L4)" />
                <input v-model="g.model" class="input" placeholder="Model" />
                <input v-model="g.firmware" class="input" placeholder="Firmware" />
            </div>
            <div class="actions">
                <button class="btn" @click="addGw">Add/Update</button>
            </div>
            <div class="hint">Stored in localStorage overrides.</div>
        </div>

        <div class="card">
            <div class="title">Gateways</div>
            <table class="table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Zone</th>
                        <th>Model</th>
                        <th>Firmware</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="gw in store.gatewaysResolved" :key="gw.gateway_id">
                        <td>{{ gw.gateway_id }}</td>
                        <td>{{ gw.zone }}</td>
                        <td>{{ gw.model }}</td>
                        <td>{{ gw.firmware }}</td>
                        <td><button class="btn danger" @click="store.removeGateway(gw.gateway_id)">Remove</button></td>
                    </tr>
                </tbody>
            </table>
        </div>

        <div class="card">
            <div class="title">Latest Status (from gateway_daily)</div>
            <table class="table">
                <thead>
                    <tr>
                        <th>Gateway</th>
                        <th>Date</th>
                        <th>Online</th>
                        <th>RSSI</th>
                        <th>Alarms</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="gw in store.gatewaysResolved" :key="gw.gateway_id + '_s'">
                        <td>{{ gw.gateway_id }}</td>
                        <td>{{ latest[gw.gateway_id]?.date || "-" }}</td>
                        <td>
                            <span :class="latest[gw.gateway_id]?.online ? 'ok' : 'bad'">
                                {{ latest[gw.gateway_id]?.online ? "ONLINE" : "OFFLINE" }}
                            </span>
                        </td>
                        <td>{{ latest[gw.gateway_id]?.rssi_dbm ?? "-" }}</td>
                        <td>{{ (latest[gw.gateway_id]?.alarms || []).join(", ") }}</td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</template>

<script setup>
import { reactive, computed, onMounted } from "vue";
import { useSiteStore } from "../stores/siteStore";

const store = useSiteStore();
onMounted(() => store.load());

const latest = computed(() => store.latestGatewayStatus || {});
const g = reactive({ gateway_id: "", zone: "", model: "", firmware: "" });

function addGw() {
    store.addGateway({ ...g });
    g.gateway_id = ""; g.zone = ""; g.model = ""; g.firmware = "";
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

.grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
}

.input {
    border: 1px solid #e1e4ea;
    border-radius: 10px;
    padding: 10px;
}

.actions {
    margin-top: 10px;
    display: flex;
    justify-content: flex-end;
}

.btn {
    border: 1px solid #e1e4ea;
    background: #f5f7fa;
    padding: 10px 12px;
    border-radius: 10px;
    cursor: pointer;
}

.danger {
    color: #e55353;
    border-color: rgba(229, 83, 83, .35);
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

.ok {
    color: #1f9d55;
    font-weight: 800;
}

.bad {
    color: #e55353;
    font-weight: 800;
}

.hint {
    font-size: 12px;
    color: #8a94a6;
    margin-top: 8px;
}
</style>
