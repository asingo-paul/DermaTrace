import {create} from 'zustand';

export interface AuthState {
  accessToken: string | null;
  userTier: string | null; // "free" | "trial" | "pro"
  syncStatus: 'synced' | 'pending' | 'syncing' | 'error';
  setToken: (token: string, tier: string) => void;
  clearToken: () => void;
  setSyncStatus: (status: AuthState['syncStatus']) => void;
}

export const useAuthStore = create<AuthState>(set => ({
  accessToken: null,
  userTier: null,
  syncStatus: 'synced',

  setToken: (token, tier) => set({accessToken: token, userTier: tier}),
  clearToken: () => set({accessToken: null, userTier: null}),
  setSyncStatus: status => set({syncStatus: status}),
}));
