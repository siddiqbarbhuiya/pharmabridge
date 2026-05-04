import { create } from 'zustand'

interface LocationState {
  lat: number | null
  lng: number | null
  hasPermission: boolean | null
  isLoading: boolean
  error: string | null
  requestLocation: () => Promise<void>
  setLocation: (lat: number, lng: number) => void
}

export const useLocationStore = create<LocationState>((set) => ({
  lat: null,
  lng: null,
  hasPermission: null,
  isLoading: false,
  error: null,

  requestLocation: async () => {
    if (!navigator.geolocation) {
      set({ error: 'Geolocation is not supported by your browser', hasPermission: false })
      return
    }
    set({ isLoading: true, error: null })
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        set({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          hasPermission: true,
          isLoading: false,
        }),
      (err) =>
        set({
          error: err.code === 1 ? 'Location access denied' : 'Unable to get your location',
          hasPermission: false,
          isLoading: false,
        }),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    )
  },

  setLocation: (lat, lng) => set({ lat, lng, hasPermission: true }),
}))
