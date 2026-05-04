import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Medicine } from '@pharmabridge/types'

export interface CartItem {
  medicine: Pick<Medicine, 'id' | 'name' | 'price' | 'mrp' | 'unit' | 'imageUrl' | 'isPrescriptionRequired' | 'pharmacyId'>
  quantity: number
}

interface CartState {
  items: CartItem[]
  pharmacyId: string | null
  addItem: (medicine: CartItem['medicine'], qty?: number) => void
  removeItem: (medicineId: string) => void
  updateQty: (medicineId: string, qty: number) => void
  clear: () => void
  total: () => number
  itemCount: () => number
  requiresPrescription: () => boolean
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      pharmacyId: null,

      addItem: (medicine, qty = 1) => {
        const { items } = get()
        const existing = items.find((i) => i.medicine.id === medicine.id)
        if (existing) {
          set({
            items: items.map((i) =>
              i.medicine.id === medicine.id ? { ...i, quantity: i.quantity + qty } : i
            ),
          })
        } else {
          set({ items: [...items, { medicine, quantity: qty }], pharmacyId: medicine.pharmacyId })
        }
      },

      removeItem: (medicineId) =>
        set((s) => ({
          items: s.items.filter((i) => i.medicine.id !== medicineId),
          pharmacyId: s.items.length <= 1 ? null : s.pharmacyId,
        })),

      updateQty: (medicineId, qty) =>
        set((s) => ({
          items:
            qty <= 0
              ? s.items.filter((i) => i.medicine.id !== medicineId)
              : s.items.map((i) => (i.medicine.id === medicineId ? { ...i, quantity: qty } : i)),
        })),

      clear: () => set({ items: [], pharmacyId: null }),

      total: () =>
        get().items.reduce((sum, i) => sum + i.medicine.price * i.quantity, 0),

      itemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),

      requiresPrescription: () =>
        get().items.some((i) => i.medicine.isPrescriptionRequired),
    }),
    { name: 'pb-cart' }
  )
)
