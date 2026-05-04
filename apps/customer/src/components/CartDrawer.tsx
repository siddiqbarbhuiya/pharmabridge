import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, Minus, Trash2, ShoppingBag, AlertCircle, ArrowRight } from 'lucide-react'
import { useCartStore } from '../stores/cartStore'

const DELIVERY_THRESHOLD = 500
const DELIVERY_FEE       = 40

export function CartDrawer() {
  const navigate = useNavigate()
  const {
    items,
    isDrawerOpen,
    setDrawerOpen,
    updateQty,
    removeItem,
    total,
    itemCount,
    requiresPrescription,
  } = useCartStore()

  const subtotal     = total()
  const deliveryFee  = subtotal >= DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE
  const grandTotal   = subtotal + deliveryFee
  const count        = itemCount()

  const handleCheckout = () => {
    setDrawerOpen(false)
    navigate('/checkout')
  }

  return (
    <AnimatePresence>
      {isDrawerOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            className="fixed inset-0 z-40 bg-ink/30 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setDrawerOpen(false)}
          />

          {/* Drawer */}
          <motion.aside
            key="drawer"
            className="fixed top-0 right-0 bottom-0 z-50 w-full sm:w-[400px] bg-bone flex flex-col shadow-2xl"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 340, damping: 36 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-line bg-paper">
              <div className="flex items-center gap-2">
                <ShoppingBag size={18} className="text-ink/60" />
                <span className="text-sm font-medium text-ink">
                  Cart {count > 0 && <span className="text-ink/40">({count})</span>}
                </span>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                className="p-1.5 rounded-md hover:bg-bone transition-colors text-ink/50 hover:text-ink"
              >
                <X size={18} />
              </button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-4 px-6 text-center">
                  <ShoppingBag size={40} className="text-ink/15" />
                  <p className="text-ink/40 text-sm">Your cart is empty</p>
                  <button
                    onClick={() => { setDrawerOpen(false); navigate('/search') }}
                    className="inline-flex items-center gap-2 h-9 rounded-md bg-ink px-4 text-sm font-medium text-paper hover:bg-ink/90 transition-colors"
                  >
                    Browse medicines
                  </button>
                </div>
              ) : (
                <ul className="divide-y divide-line">
                  {items.map((item) => {
                    const { medicine, quantity } = item
                    const atStockLimit = medicine.stock !== undefined && quantity >= medicine.stock
                    const nearStockLimit = medicine.stock !== undefined && medicine.stock <= 5 && medicine.stock > 0

                    return (
                      <li key={medicine.id} className="px-5 py-4">
                        <div className="flex items-start gap-3">
                          {/* Image or placeholder */}
                          <div className="w-10 h-10 rounded-lg bg-mist flex items-center justify-center shrink-0 overflow-hidden">
                            {medicine.imageUrl
                              ? <img src={medicine.imageUrl} alt="" className="w-full h-full object-cover" />
                              : <span className="text-xs font-mono text-ink/30">Rx</span>
                            }
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-ink truncate">{medicine.name}</p>
                                <p className="text-xs text-ink/40 mt-0.5">{medicine.unit}</p>
                              </div>
                              <button
                                onClick={() => removeItem(medicine.id)}
                                className="p-1 text-ink/30 hover:text-danger transition-colors shrink-0"
                                aria-label="Remove item"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>

                            {/* Rx badge */}
                            {medicine.isPrescriptionRequired && (
                              <div className="flex items-center gap-1 mt-1.5">
                                <AlertCircle size={11} className="text-amber-500 shrink-0" />
                                <span className="text-[11px] text-amber-600">Prescription required</span>
                              </div>
                            )}

                            {/* Stock warning */}
                            {nearStockLimit && (
                              <p className="text-[11px] text-danger mt-1">
                                Only {medicine.stock} left
                              </p>
                            )}

                            {/* Price + qty controls */}
                            <div className="flex items-center justify-between mt-2.5">
                              <p className="text-sm font-medium text-ink">
                                ₹{(medicine.price * quantity).toFixed(0)}
                                {quantity > 1 && (
                                  <span className="text-xs text-ink/40 font-normal ml-1">
                                    ₹{medicine.price} × {quantity}
                                  </span>
                                )}
                              </p>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => updateQty(medicine.id, quantity - 1)}
                                  className="w-7 h-7 rounded-md border border-line bg-paper flex items-center justify-center hover:border-ink/30 transition-colors"
                                >
                                  <Minus size={12} className="text-ink/60" />
                                </button>
                                <span className="w-8 text-center text-sm font-medium text-ink tabular-nums">
                                  {quantity}
                                </span>
                                <button
                                  onClick={() => updateQty(medicine.id, quantity + 1)}
                                  disabled={atStockLimit}
                                  className="w-7 h-7 rounded-md border border-line bg-paper flex items-center justify-center hover:border-ink/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                  <Plus size={12} className="text-ink/60" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="border-t border-line bg-paper px-5 py-5 space-y-3">
                {/* Prescription notice */}
                {requiresPrescription() && (
                  <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
                    <AlertCircle size={13} className="shrink-0 mt-0.5" />
                    <span>You'll need to upload a prescription during checkout.</span>
                  </div>
                )}

                {/* Totals */}
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between text-ink/60">
                    <span>Subtotal</span>
                    <span>₹{subtotal.toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between text-ink/60">
                    <span>Delivery fee</span>
                    <span className={deliveryFee === 0 ? 'text-rx' : ''}>
                      {deliveryFee === 0 ? 'Free' : `₹${deliveryFee}`}
                    </span>
                  </div>
                  {deliveryFee > 0 && (
                    <p className="text-xs text-ink/40">
                      Add ₹{(DELIVERY_THRESHOLD - subtotal).toFixed(0)} more for free delivery
                    </p>
                  )}
                  <div className="flex justify-between font-medium text-ink pt-1.5 border-t border-line">
                    <span>Total</span>
                    <span>₹{grandTotal.toFixed(0)}</span>
                  </div>
                </div>

                {/* Checkout CTA */}
                <button
                  onClick={handleCheckout}
                  className="w-full flex items-center justify-center gap-2 h-11 rounded-md bg-ink text-paper text-sm font-medium uppercase tracking-wider hover:bg-ink/90 transition-colors"
                >
                  Checkout
                  <ArrowRight size={15} />
                </button>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
