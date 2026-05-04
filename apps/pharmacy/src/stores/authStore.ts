import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { UserProfile } from '@pharmabridge/types'

interface PharmacyAuthState {
  user: UserProfile | null
  pharmacyId: string | null
  accessToken: string | null
  setAuth: (user: UserProfile, token: string, pharmacyId: string) => void
  setToken: (token: string) => void
  logout: () => void
  isAuthenticated: () => boolean
}

export const useAuthStore = create<PharmacyAuthState>()(
  persist(
    (set, get) => ({
      user: null,
      pharmacyId: null,
      accessToken: null,
      setAuth: (user, accessToken, pharmacyId) => set({ user, accessToken, pharmacyId }),
      setToken: (accessToken) => set({ accessToken }),
      logout: () => set({ user: null, accessToken: null, pharmacyId: null }),
      isAuthenticated: () => !!get().accessToken && !!get().user,
    }),
    {
      name: 'pb-pharmacy-auth',
      partialize: (state) => ({ user: state.user, pharmacyId: state.pharmacyId }),
    }
  )
)
