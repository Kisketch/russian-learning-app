import { defineStore } from 'pinia';
import { initialWords } from '../data/words';
import { calculateSM2 } from '../utils/sm2';
import { supabase } from '../utils/supabase';
import { useAuthStore } from './authStore';

export const useWordStore = defineStore('wordStore', {
  state: () => ({
    words: [], learningData: {}, mistakesQueue: [],
    isLoading: false, error: null, settings: { autoPlayAudio: true }
  }),
  actions: {
    async initStoreAsync() {
      const authStore = useAuthStore(); if (!authStore.user) return;
      this.isLoading = true; this.words = initialWords;
      try {
        const { data, error } = await supabase.from('learning_progress').select('*').eq('user_id', authStore.user.id);
        if (error) throw error;
        this.learningData = {};
        if (data) data.forEach(item => {
          this.learningData[item.word_id] = { interval: item.interval, repetitions: item.repetitions, easeFactor: item.ease_factor, nextReviewDate: item.next_review_date };
        });
        this.words.forEach(w => {
          if (!this.learningData[w.id]) this.learningData[w.id] = { interval: 0, repetitions: 0, easeFactor: 2.5, nextReviewDate: new Date().toISOString() };
        });
      } catch (err) { this.error = '数据加载失败 (可能是未配置环境变量)'; } finally { this.isLoading = false; }
    },
    async reviewWord(wordId, quality) {
      const authStore = useAuthStore();
      const currentData = this.learningData[wordId] || { interval: 0, repetitions: 0, easeFactor: 2.5 };
      const previousInterval = currentData.interval;
      const result = calculateSM2(quality, currentData.interval, currentData.repetitions, currentData.easeFactor);
      
      const nextDate = new Date(); nextDate.setDate(nextDate.getDate() + result.interval);
      this.learningData[wordId] = { ...result, nextReviewDate: nextDate.toISOString() };
      
      // 错词本逻辑
      if (quality === 1 && !this.mistakesQueue.includes(wordId)) {
        this.mistakesQueue.push(wordId);
      } else if (quality >= 3 && this.mistakesQueue.includes(wordId)) {
        this.mistakesQueue = this.mistakesQueue.filter(id => id !== wordId);
      }

      if (!authStore.user) return; // 本地测试环境兼容
      try {
        await supabase.from('learning_progress').upsert({
          user_id: authStore.user.id, word_id: wordId, interval: result.interval,
          repetitions: result.repetitions, ease_factor: result.easeFactor, next_review_date: nextDate.toISOString()
        }, { onConflict: 'user_id, word_id' });
        await supabase.from('study_logs').insert({
          user_id: authStore.user.id, word_id: wordId, score: quality,
          previous_interval: previousInterval, new_interval: result.interval, ease_factor: result.easeFactor
        });
      } catch (e) { console.error('云端同步失败'); }
    },
    getWordsToReview() {
      const now = new Date().toISOString();
      return this.words.filter(w => this.learningData[w.id]?.nextReviewDate <= now);
    },
    getMistakes() {
      return this.words.filter(w => this.mistakesQueue.includes(w.id));
    },
    toggleAutoPlay() { this.settings.autoPlayAudio = !this.settings.autoPlayAudio; }
  }
});