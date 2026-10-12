<script setup>
import { onMounted, onUnmounted, ref, computed, watch } from 'vue';
import { useWordStore } from './store/wordStore';
import { useAuthStore } from './store/authStore';
import Dashboard from './components/Dashboard.vue';

const wordStore = useWordStore();
const authStore = useAuthStore();
const currentWord = ref(null);
const showAnswer = ref(false);
const spellInput = ref('');
const spellError = ref(false);
const activeTab = ref('flashcard'); // flashcard, spell, mistakes, dashboard
const isLoginMode = ref(true);
const email = ref('test@example.com');
const password = ref('123456');

onMounted(async () => {
  window.addEventListener('keydown', handleKeydown);
  await authStore.initialize();
  // If no Supabase config, bypass auth for demo
  if (!import.meta.env.VITE_SUPABASE_URL) {
    authStore.user = { email: '本地演示模式' };
    wordStore.initStoreAsync().then(() => loadNextWord());
  }
});
onUnmounted(() => window.removeEventListener('keydown', handleKeydown));

watch(() => authStore.user, async (newUser) => {
  if (newUser) { await wordStore.initStoreAsync(); loadNextWord(); }
});

const progress = computed(() => {
  const queue = activeTab.value === 'mistakes' ? wordStore.getMistakes() : wordStore.getWordsToReview();
  return { total: activeTab.value === 'mistakes' ? queue.length : wordStore.words.length, remaining: queue.length };
});

const loadNextWord = () => {
  showAnswer.value = false; spellInput.value = ''; spellError.value = false;
  const queue = activeTab.value === 'mistakes' ? wordStore.getMistakes() : wordStore.getWordsToReview();
  currentWord.value = queue.length > 0 ? queue[Math.floor(Math.random() * queue.length)] : null;
  if (currentWord.value && wordStore.settings.autoPlayAudio) playAudio(currentWord.value.word);
};

watch(activeTab, () => loadNextWord());

const handleAuth = async () => {
  try { isLoginMode.value ? await authStore.signIn(email.value, password.value) : null; } 
  catch (e) { alert('请配置Supabase环境变量，或在此直接刷新重试(演示模式)'); }
};

const checkSpelling = () => {
  const cleanTarget = currentWord.value.word.replace(/\u0301/g, '').toLowerCase();
  if (cleanTarget === spellInput.value.trim().toLowerCase()) { showAnswer.value = true; spellError.value = false; }
  else { spellError.value = true; setTimeout(() => spellError.value = false, 800); }
};

const handleRate = (quality) => {
  if (currentWord.value) { wordStore.reviewWord(currentWord.value.id, quality); loadNextWord(); }
};

const playAudio = (text) => {
  if ('speechSynthesis' in window) {
    const u = new SpeechSynthesisUtterance(text.replace(/\u0301/g, '')); u.lang = 'ru-RU'; window.speechSynthesis.speak(u);
  }
};

const handleKeydown = (e) => {
  if (e.target.tagName === 'INPUT' || activeTab.value === 'dashboard' || !currentWord.value) return;
  if (!showAnswer.value && activeTab.value !== 'spell') {
    if (e.code === 'Space') { e.preventDefault(); showAnswer.value = true; }
  } else if (showAnswer.value) {
    if(e.key==='1') handleRate(1); else if(e.key==='2') handleRate(3); else if(e.key==='3') handleRate(4); else if(e.key==='4') handleRate(5);
    else if(e.key.toLowerCase()==='r') playAudio(currentWord.value.word);
  }
};
</script>

<template>
  <div class="min-h-screen bg-swiss-gray flex flex-col font-sans text-swiss-dark">
    
    <!-- Auth Modal -->
    <div v-if="!authStore.isLoading && !authStore.user" class="fixed inset-0 bg-white/80 backdrop-blur-md flex items-center justify-center z-50">
      <div class="bg-white p-10 rounded-3xl shadow-xl w-full max-w-sm">
        <h2 class="text-2xl font-bold mb-8 text-center">登录系统</h2>
        <form @submit.prevent="handleAuth" class="space-y-4">
          <button type="submit" class="w-full py-3 bg-swiss-dark text-white rounded-xl font-medium">进入本地演示版</button>
        </form>
      </div>
    </div>

    <!-- Main App -->
    <div v-if="authStore.user" class="flex-1 flex flex-col">
      <!-- Navbar -->
      <nav class="bg-white border-b border-gray-100 px-6 py-4 flex justify-between items-center sticky top-0 z-10">
        <div class="flex space-x-2 bg-swiss-gray p-1 rounded-xl">
          <button @click="activeTab='flashcard'" :class="['px-4 py-2 text-sm rounded-lg transition-colors', activeTab==='flashcard'?'bg-white shadow-sm font-semibold':'text-gray-500']">卡片</button>
          <button @click="activeTab='spell'" :class="['px-4 py-2 text-sm rounded-lg transition-colors', activeTab==='spell'?'bg-white shadow-sm font-semibold':'text-gray-500']">拼写</button>
          <button @click="activeTab='mistakes'" :class="['px-4 py-2 text-sm rounded-lg transition-colors', activeTab==='mistakes'?'bg-white shadow-sm font-semibold text-red-600':'text-gray-500']">
            错词本 <span v-if="wordStore.mistakesQueue.length" class="ml-1 bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full text-xs">{{wordStore.mistakesQueue.length}}</span>
          </button>
          <button @click="activeTab='dashboard'" :class="['px-4 py-2 text-sm rounded-lg transition-colors', activeTab==='dashboard'?'bg-white shadow-sm font-semibold':'text-gray-500']">数据看板</button>
        </div>
        <div class="flex items-center gap-4 text-sm text-gray-500">
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" :checked="wordStore.settings.autoPlayAudio" @change="wordStore.toggleAutoPlay()" class="accent-swiss-blue">
            <span>自动发音</span>
          </label>
        </div>
      </nav>

      <!-- Content Area -->
      <main class="flex-1 flex items-center justify-center p-4 sm:p-8">
        <Dashboard v-if="activeTab === 'dashboard'" />
        
        <div v-else-if="currentWord" class="w-full max-w-xl bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8 sm:p-12 animate-fade-in">
          <div class="text-center mb-8">
             <p class="text-sm text-gray-400 mb-2">剩余待复习: {{ progress.remaining }}</p>
             <h2 v-if="activeTab === 'spell' && !showAnswer" class="text-3xl font-medium text-gray-800">{{ currentWord.translation }}</h2>
             <h2 v-else class="text-5xl sm:text-6xl font-bold tracking-tight text-swiss-dark cursor-pointer hover:text-swiss-blue transition-colors" @click="playAudio(currentWord.word)">{{ currentWord.word }}</h2>
          </div>

          <div v-if="activeTab === 'spell' && !showAnswer" class="mb-8">
            <input v-model="spellInput" @keyup.enter="checkSpelling" type="text" placeholder="输入俄语并按回车..." :class="['w-full px-6 py-4 bg-swiss-gray rounded-xl text-center text-xl focus:outline-none transition-all', spellError ? 'bg-red-50 text-red-500' : 'focus:ring-2 focus:ring-swiss-blue']" autofocus/>
          </div>

          <div v-if="showAnswer" class="pt-8 border-t border-gray-50 animate-fade-in">
            <p v-if="activeTab === 'spell'" class="text-4xl font-bold text-center mb-6 text-green-600">{{ currentWord.word }}</p>
            <p v-else class="text-xl font-medium text-center mb-6">{{ currentWord.translation }}</p>
            <div class="bg-swiss-gray rounded-2xl p-4 text-sm text-gray-700">📖 形态学: {{ currentWord.morphology.details }}</div>
          </div>

          <div class="mt-8">
            <button v-if="!showAnswer && activeTab !== 'spell'" @click="showAnswer = true" class="w-full py-4 bg-swiss-dark text-white rounded-xl font-medium hover:bg-black transition-colors">显示答案 (Space)</button>
            <div v-if="showAnswer" class="grid grid-cols-4 gap-2">
              <button @click="handleRate(1)" class="py-3 bg-red-50 text-red-600 rounded-xl text-sm font-medium hover:bg-red-100 flex flex-col items-center"><span>忘记</span><span class="text-xs opacity-50">[1]</span></button>
              <button @click="handleRate(3)" class="py-3 bg-orange-50 text-orange-600 rounded-xl text-sm font-medium hover:bg-orange-100 flex flex-col items-center"><span>困难</span><span class="text-xs opacity-50">[2]</span></button>
              <button @click="handleRate(4)" class="py-3 bg-green-50 text-green-600 rounded-xl text-sm font-medium hover:bg-green-100 flex flex-col items-center"><span>记住</span><span class="text-xs opacity-50">[3]</span></button>
              <button @click="handleRate(5)" class="py-3 bg-blue-50 text-swiss-blue rounded-xl text-sm font-medium hover:bg-blue-100 flex flex-col items-center"><span>简单</span><span class="text-xs opacity-50">[4]</span></button>
            </div>
          </div>
        </div>
        
        <div v-else class="text-center animate-fade-in">
          <div class="text-6xl mb-6">🎉</div>
          <h2 class="text-2xl font-semibold mb-2">{{ activeTab === 'mistakes' ? '错词本已清空！' : '今日任务已完成！' }}</h2>
          <p class="text-gray-500 text-sm">去“数据看板”看看你的学习成果吧。</p>
        </div>
      </main>
    </div>
  </div>
</template>
<style>
.animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
</style>