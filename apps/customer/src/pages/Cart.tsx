import { useEffect } from 'react'
import { useCartStore } from '../stores/cartStore'

export default function CartPage() {
  const { setDrawerOpen } = useCartStore()

  useEffect(() => {
    setDrawerOpen(true)
  }, [setDrawerOpen])

  return null
}
