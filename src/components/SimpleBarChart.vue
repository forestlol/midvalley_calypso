<template>
    <canvas ref="el"></canvas>
</template>

<script setup>
import { onMounted, onBeforeUnmount, ref, watch } from "vue";
import {
    Chart,
    BarController,
    BarElement,
    CategoryScale,
    LinearScale,
    Tooltip,
    Legend,
} from "chart.js";

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const props = defineProps({
    labels: { type: Array, default: () => [] },
    values: { type: Array, default: () => [] },
    title: { type: String, default: "" },
});

const el = ref(null);
let chart = null;

function render() {
    if (!el.value) return;
    if (chart) chart.destroy();

    chart = new Chart(el.value, {
        type: "bar",
        data: {
            labels: props.labels,
            datasets: [{ label: props.title || "Value", data: props.values }],
        },
        options: {
            responsive: true,
            plugins: { legend: { display: true } },
            scales: { y: { beginAtZero: true } },
        },
    });
}

onMounted(render);
watch(() => [props.labels, props.values, props.title], render, { deep: true });
onBeforeUnmount(() => chart?.destroy());
</script>
