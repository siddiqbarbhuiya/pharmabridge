import { create } from 'zustand'

interface PharmacyAddress {
  line1: string; line2?: string; city: string
  state: string; pincode: string
}

interface PharmacyData {
  id: string
  name: string
  phone: string
  logoUrl: string | null
  isActive: boolean
  isApproved: boolean
  address: PharmacyAddress
  deliveryRadius: number
  _count?: { doctors: number; medicines: number }
}

interface PharmacyState {
  pharmacyData: PharmacyData | null
  setPharmacyData: (data: PharmacyData) => void
  setIsOpen: (isActive: boolean) => void
  clearPharmacy: () => void
}

export const usePharmacyStore = create<PharmacyState>((set) => ({
  pharmacyData: null,
  setPharmacyData: (data) => set({ pharmacyData: data }),
  setIsOpen: (isActive) =>
    set((s) => ({
      pharmacyData: s.pharmacyData ? { ...s.pharmacyData, isActive } : null,
    })),
  clearPharmacy: () => set({ pharmacyData: null }),
}))
