import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { UserProfile } from '@pharmabridge/types'

interface AuthState {
  user: UserProfile | null
  accessToken: string | null
  setAuth: (user: UserProfile, token: string) => void
  setToken: (token: string) => void
  logout: () => void
  isAuthenticated: () => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      setAuth: (user, accessToken) => set({ user, accessToken }),
      setToken: (accessToken) => set({ accessToken }),
      logout: () => set({ user: null, accessToken: null }),
      isAuthenticated: () => !!get().accessToken && !!get().user,
    }),
    {
      name: 'pb-auth',
      partialize: (state) => ({ user: state.user }),
    }
  )
)
