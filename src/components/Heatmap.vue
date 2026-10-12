<script setup>
import { ref, onMounted, computed } from 'vue';
import { supabase } from '../utils/supabase';
import { useAuthStore } from '../store/authStore';
const authStore = useAuthStore();
const logData = ref({});
const isLoading = ref(true);
const days = computed(() => {
  const result = []; const today = new Date();
  for (let i = 364; i >= 0; i--) {
    const d = new Date(today); d.setDate(today.getDate() - i);
    result.push(d.toISOString().split('T')[0]);
  }
  return result;
});
const getColor = (count) => {
  if (count === 0) return '#F5F5F7'; if (count < 5) return '#B3D6FF';
  if (count < 15) return '#4D99FF'; return '#0066CC';
};
onMounted(async () => {
  if (!authStore.user) { isLoading.value = false; return; }
  const oneYearAgo = new Date(); oneYearAgo.setDate(oneYearAgo.getDate() - 365);
  try {
    const { data } = await supabase.from('study_logs').select('created_at').eq('user_id', authStore.user.id).gte('created_at', oneYearAgo.toISOString());
    const counts = {};
    if (data) data.forEach(log => {
      const dateKey = log.created_at.split('T')[0];
      counts[dateKey] = (counts[dateKey] || 0) + 1;
    });
    logData.value = counts;
  } catch (err) {} finally { isLoading.value = false; }
});
</script>
<template>
  <div class="w-full overflow-x-auto pb-4 custom-scrollbar">
    <div v-if="isLoading" class="flex justify-center py-4"><div class="w-5 h-5 border-2 border-swiss-blue rounded-full animate-spin border-t-transparent"></div></div>
    <div v-else class="min-w-max flex gap-1.5" style="grid-auto-columns: max-content;">
      <div class="grid grid-rows-7 gap-1.5 grid-flow-col">
        <div v-for="date in days" :key="date" class="w-3 h-3 rounded-[2px]" :style="{ backgroundColor: getColor(logData[date] || 0) }" :title="`${date}: ${logData[date] || 0}次`"></div>
      </div>
    </div>
  </div>
</template>