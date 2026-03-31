<template>
    <div class="temp-sensor-page">
        <div class="page-header">
            <div>
                <h1>Temp Sensor</h1>
                <p>View enabled temperature sensors and add new ones.</p>
            </div>
            <button class="btn secondary" :disabled="loading" @click="loadSensors">
                Refresh
            </button>
        </div>

        <div class="card">
            <div class="card-title">Add Temperature Sensor</div>

            <div class="form-grid">
                <label class="field">
                    <span>Device ID</span>
                    <input v-model="form.device_id" class="input" placeholder="e.g. 647FDA0000022695" />
                </label>

                <label class="field">
                    <span>Name</span>
                    <input v-model="form.name" class="input" placeholder="e.g. Comfort Sensor" />
                </label>

                <label class="field">
                    <span>Location</span>
                    <input v-model="form.location" class="input" placeholder="e.g. BLK A" />
                </label>

                <label class="field">
                    <span>Enabled</span>
                    <select v-model="form.enabled" class="input">
                        <option :value="true">Yes</option>
                        <option :value="false">No</option>
                    </select>
                </label>

                <label class="field field-wide">
                    <span>Description</span>
                    <textarea v-model="form.description" class="input textarea" placeholder="Sample description here" />
                </label>

                <label class="field field-wide">
                    <span>Tags</span>
                    <input v-model="tagsInput" class="input" placeholder="Level 1, BLK A, Toilet" />
                    <small class="hint">Separate tags with commas.</small>
                </label>
            </div>

            <div class="actions">
                <button class="btn primary" :disabled="submitting" @click="createSensor">
                    {{ submitting ? "Saving..." : "Add Temperature Sensor" }}
                </button>
            </div>

            <div v-if="formError" class="status error">{{ formError }}</div>
            <div v-else-if="formSuccess" class="status success">{{ formSuccess }}</div>
        </div>

        <div class="card">
            <div class="card-title">
                Temperature Sensor List
                <span class="count">{{ sensors.length }}</span>
            </div>

            <div v-if="error" class="status error">{{ error }}</div>

            <div class="table-wrap">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Device ID</th>
                            <th>Name</th>
                            <th>Location</th>
                            <th>Description</th>
                            <th>Enabled</th>
                            <th>Tags</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="sensor in sensors" :key="sensor.device_id">
                            <td>{{ sensor.device_id || "-" }}</td>
                            <td>{{ sensor.name || "-" }}</td>
                            <td>{{ sensor.location || "-" }}</td>
                            <td>{{ sensor.description || "-" }}</td>
                            <td>{{ sensor.enabled ? "Yes" : "No" }}</td>
                            <td>
                                <span v-if="sensor.tags?.length">{{ sensor.tags.join(", ") }}</span>
                                <span v-else>-</span>
                            </td>
                        </tr>

                        <tr v-if="!loading && sensors.length === 0">
                            <td colspan="6" class="empty">No temperature sensors found.</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div v-if="loading" class="hint">Loading sensors...</div>
        </div>
    </div>
</template>

<script setup>
import { onMounted, reactive, ref } from "vue";

const SENSOR_LIST_URL = "https://midvalley-temperature.rshare.io/api/konamicro/temperature-sensors?enabled=true&limit=500";
const SENSOR_CREATE_URL = "https://midvalley-temperature.rshare.io/api/konamicro/temperature-sensors";

const sensors = ref([]);
const loading = ref(false);
const submitting = ref(false);
const error = ref("");
const formError = ref("");
const formSuccess = ref("");
const tagsInput = ref("");

const form = reactive({
    device_id: "",
    name: "",
    location: "",
    description: "",
    enabled: true
});

onMounted(() => {
    loadSensors();
});

async function loadSensors() {
    loading.value = true;
    error.value = "";

    try {
        const res = await fetch(SENSOR_LIST_URL);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();
        sensors.value = normalizeSensors(data);
    } catch (e) {
        console.error("loadSensors failed:", e);
        error.value = e?.message || "Failed to load temperature sensors.";
        sensors.value = [];
    } finally {
        loading.value = false;
    }
}

async function createSensor() {
    formError.value = "";
    formSuccess.value = "";

    const payload = buildPayload();
    if (!payload) return;

    submitting.value = true;

    try {
        const res = await fetch(SENSOR_CREATE_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const message = await readErrorMessage(res);
            throw new Error(message || `HTTP ${res.status}`);
        }

        formSuccess.value = "Temperature sensor added.";
        resetForm();
        await loadSensors();
    } catch (e) {
        console.error("createSensor failed:", e);
        formError.value = e?.message || "Failed to add temperature sensor.";
    } finally {
        submitting.value = false;
    }
}

function buildPayload() {
    const deviceId = form.device_id.trim();
    const name = form.name.trim();
    const location = form.location.trim();

    if (!deviceId || !name || !location) {
        formError.value = "Device ID, name, and location are required.";
        return null;
    }

    return {
        device_id: deviceId,
        name,
        location,
        description: form.description.trim(),
        enabled: Boolean(form.enabled),
        tags: parseTags(tagsInput.value)
    };
}

function parseTags(value) {
    return String(value || "")
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);
}

function normalizeSensors(data) {
    const arr = Array.isArray(data)
        ? data
        : Array.isArray(data?.items)
            ? data.items
            : Array.isArray(data?.sensors)
                ? data.sensors
                : [];

    return arr.map((sensor) => ({
        device_id: String(sensor?.device_id || "").trim(),
        name: sensor?.name || "",
        location: sensor?.location || "",
        description: sensor?.description || "",
        enabled: Boolean(sensor?.enabled),
        tags: Array.isArray(sensor?.tags) ? sensor.tags : []
    }));
}

async function readErrorMessage(res) {
    try {
        const data = await res.json();
        return data?.message || data?.detail || JSON.stringify(data);
    } catch {
        return "";
    }
}

function resetForm() {
    form.device_id = "";
    form.name = "";
    form.location = "";
    form.description = "";
    form.enabled = true;
    tagsInput.value = "";
}
</script>

<style scoped>
.temp-sensor-page {
    min-height: 100%;
    padding: 24px;
}

.page-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
    margin-bottom: 24px;
}

.page-header h1 {
    font-size: 28px;
    font-weight: 800;
    margin: 0;
}

.page-header p {
    margin: 4px 0 0;
    font-size: 14px;
    color: #5f6b7a;
}

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
    margin-bottom: 16px;
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

.form-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
}

.field {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.field span {
    font-size: 12px;
    color: #6b7280;
    font-weight: 700;
}

.field-wide {
    grid-column: 1 / -1;
}

.input {
    width: 100%;
    border: 1px solid #d6dbe6;
    border-radius: 10px;
    padding: 10px 12px;
    font-size: 14px;
    box-sizing: border-box;
}

.textarea {
    min-height: 96px;
    resize: vertical;
}

.input:focus {
    outline: none;
    border-color: #1976d2;
}

.actions {
    margin-top: 16px;
    display: flex;
    justify-content: flex-end;
}

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

.btn.secondary {
    background: #f3f6fa;
    color: #2f3542;
    border: 1px solid #d6dbe6;
}

.btn:disabled {
    opacity: 0.65;
    cursor: not-allowed;
}

.status {
    margin-top: 14px;
    padding: 10px 12px;
    border-radius: 10px;
    font-size: 14px;
}

.status.success {
    background: rgba(56, 142, 60, 0.12);
    color: #2e7d32;
}

.status.error {
    background: rgba(229, 83, 83, 0.12);
    color: #c62828;
}

.hint {
    margin-top: 8px;
    font-size: 12px;
    color: #6b7280;
}

.table-wrap {
    overflow-x: auto;
}

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
    vertical-align: top;
}

.empty {
    text-align: center;
    padding: 20px;
    color: #6b7280;
}

@media (max-width: 900px) {
    .page-header {
        flex-direction: column;
        align-items: stretch;
    }

    .form-grid {
        grid-template-columns: 1fr;
    }
}
</style>
