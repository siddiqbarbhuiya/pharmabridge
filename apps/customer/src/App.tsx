import { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { ShoppingBag } from 'lucide-react'
import { PageSkeleton } from './components/PageSkeleton'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Toaster } from './components/Toaster'
import { CartDrawer } from './components/CartDrawer'
import { useCartStore } from './stores/cartStore'

// ── Public pages ──────────────────────────────────────────────────────────
const HomePage            = lazy(() => import('./pages/Home'))
const SearchPage          = lazy(() => import('./pages/Search'))
const PharmacyPage        = lazy(() => import('./pages/Pharmacy'))
const MedicinePage        = lazy(() => import('./pages/Medicine'))
const CartPage            = lazy(() => import('./pages/Cart'))
const LoginPage           = lazy(() => import('./pages/auth/Login'))
const DoctorsPage         = lazy(() => import('./pages/doctors/Doctors'))
const DoctorProfilePage   = lazy(() => import('./pages/doctors/DoctorProfile'))
const NotFoundPage        = lazy(() => import('./pages/NotFound'))

// ── Protected pages ───────────────────────────────────────────────────────
const CheckoutPage           = lazy(() => import('./pages/checkout/Checkout'))
const OrderConfirmationPage  = lazy(() => import('./pages/checkout/OrderConfirmation'))
const OrdersPage             = lazy(() => import('./pages/Orders'))
const OrderDetailPage        = lazy(() => import('./pages/OrderDetail'))
const PrescriptionsPage      = lazy(() => import('./pages/Prescriptions'))
const ProfilePage            = lazy(() => import('./pages/Profile'))
const NotificationsPage      = lazy(() => import('./pages/Notifications'))
const AppointmentsPage       = lazy(() => import('./pages/appointments/Appointments'))
const AppointmentDetailPage  = lazy(() => import('./pages/appointments/AppointmentDetail'))

function AnimatedRoutes() {
  const location = useLocation()

  return (
    <AnimatePresence mode="wait" initial={false}>
      <Routes location={location} key={location.pathname}>

        {/* ── Public ─────────────────────────────────────────────────── */}
        <Route path="/"               element={<HomePage />} />
        <Route path="/search"         element={<SearchPage />} />
        <Route path="/pharmacy/:slug" element={<PharmacyPage />} />
        <Route path="/medicine/:id"   element={<MedicinePage />} />
        <Route path="/cart"           element={<CartPage />} />
        <Route path="/auth/login"     element={<LoginPage />} />
        <Route path="/doctors"        element={<DoctorsPage />} />
        <Route path="/doctors/:id"    element={<DoctorProfilePage />} />

        {/* ── Protected (requires auth) ───────────────────────────────── */}
        <Route element={<ProtectedRoute />}>
          <Route path="/checkout"               element={<CheckoutPage />} />
          <Route path="/checkout/*"             element={<CheckoutPage />} />
          <Route path="/orders"                 element={<OrdersPage />} />
          <Route path="/orders/:id"             element={<OrderDetailPage />} />
          <Route path="/orders/:id/confirmed"   element={<OrderConfirmationPage />} />
          <Route path="/prescriptions"          element={<PrescriptionsPage />} />
          <Route path="/profile"                element={<ProfilePage />} />
          <Route path="/notifications"          element={<NotificationsPage />} />
          <Route path="/appointments"           element={<AppointmentsPage />} />
          <Route path="/appointments/:id"       element={<AppointmentDetailPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />

      </Routes>
    </AnimatePresence>
  )
}

function CartFab() {
  const { itemCount, setDrawerOpen } = useCartStore()
  const count = itemCount()
  if (count === 0) return null

  return (
    <button
      onClick={() => setDrawerOpen(true)}
      className="fixed bottom-6 right-6 z-30 flex items-center gap-2 bg-ink text-paper pl-4 pr-5 py-3 rounded-full shadow-lg hover:bg-ink/90 transition-all active:scale-95"
    >
      <ShoppingBag size={17} />
      <span className="text-sm font-medium tabular-nums">{count}</span>
    </button>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster />
      <CartDrawer />
      <Suspense fallback={<PageSkeleton />}>
        <AnimatedRoutes />
        <CartFab />
      </Suspense>
    </BrowserRouter>
  )
}
