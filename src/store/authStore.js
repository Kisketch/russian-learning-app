import { defineStore } from 'pinia';
import { supabase } from '../utils/supabase';
export const useAuthStore = defineStore('authStore', {
  state: () => ({ user: null, session: null, isLoading: true }),
  actions: {
    async initialize() {
      const { data: { session } } = await supabase.auth.getSession();
      this.session = session; this.user = session?.user ?? null; this.isLoading = false;
      supabase.auth.onAuthStateChange((_event, session) => {
        this.session = session; this.user = session?.user ?? null;
      });
    },
    async signIn(email, password) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error; return data;
    },
    async signOut() { await supabase.auth.signOut(); }
  }
});