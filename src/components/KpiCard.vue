<template>
    <div class="card">
        <div class="label">{{ label }}</div>
        <div class="value">{{ value }}</div>
        <div v-if="hint" class="hint">{{ hint }}</div>
    </div>
</template>

<script setup>
defineProps({
    label: String,
    value: [String, Number],
    hint: String,
});
</script>

<style scoped>
.card {
    background: #112d5c;
    color: #fff;
    border: 1px solid rgba(255, 255, 255, .12);
    border-radius: 14px;
    padding: 12px;
    box-shadow: 0 8px 22px rgba(0, 0, 0, .18);
    min-height: 90px;
    display: flex;
    flex-direction: column;
    justify-content: center;
}

.label {
    font-size: 12px;
    opacity: .85;
}

.value {
    font-size: 22px;
    font-weight: 800;
    margin-top: 6px;
}

.hint {
    font-size: 11px;
    opacity: .75;
    margin-top: 6px;
}
</style>
