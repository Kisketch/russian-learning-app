<script setup>
import { computed } from 'vue';
import { useWordStore } from '../store/wordStore';
import Heatmap from './Heatmap.vue';
import { Doughnut, Line } from 'vue-chartjs';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement } from 'chart.js';
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement);
const store = useWordStore();

const masteryData = computed(() => {
  let newW=0, learn=0, master=0;
  store.words.forEach(w => {
    const d = store.learningData[w.id];
    if (!d || d.interval === 0) newW++; else if (d.interval < 21) learn++; else master++;
  });
  return { labels: ['未学', '学习中', '掌握'], datasets: [{ data: [newW, learn, master], backgroundColor: ['#F5F5F7', '#80B3E6', '#0066CC'], borderWidth: 0 }] };
});
const doughnutOptions = { responsive: true, cutout: '80%', plugins: { legend: { position: 'bottom' } } };

const forecastData = computed(() => {
  const counts = new Array(7).fill(0);
  const labels = Array.from({length: 7}, (_, i) => { const d = new Date(); d.setDate(d.getDate()+i); return d.toISOString().split('T')[0]; });
  store.words.forEach(w => {
    const d = store.learningData[w.id];
    if (d?.nextReviewDate) {
      const idx = labels.indexOf(d.nextReviewDate.split('T')[0]);
      if (idx !== -1) counts[idx]++; else if (d.nextReviewDate < new Date().toISOString()) counts[0]++;
    }
  });
  return { labels: labels.map(l=>l.substring(5).replace('-','/')), datasets: [{ data: counts, borderColor: '#0066CC', borderWidth: 2, tension: 0.4, pointRadius: 3 }] };
});
const lineOptions = { responsive: true, maintainAspectRatio: false, scales: { x: { display: false }, y: { display: false, beginAtZero: true } }, plugins: { legend: { display: false } } };
</script>
<template>
  <div class="flex flex-col gap-6 w-full max-w-2xl mx-auto mt-8 animate-fade-in-up">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div class="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center">
        <h3 class="text-sm font-semibold text-gray-500 mb-4">掌握度分布</h3>
        <div class="w-40 h-40"><Doughnut :data="masteryData" :options="doughnutOptions" /></div>
      </div>
      <div class="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col">
        <h3 class="text-sm font-semibold text-gray-500 mb-4 text-center">未来 7 天预测</h3>
        <div class="h-40 w-full"><Line :data="forecastData" :options="lineOptions" /></div>
      </div>
    </div>
    <div class="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
      <h3 class="text-sm font-semibold text-gray-500 mb-4">年度复习恒心</h3>
      <Heatmap />
    </div>
  </div>
</template>