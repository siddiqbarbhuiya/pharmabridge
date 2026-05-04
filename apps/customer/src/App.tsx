import { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { PageSkeleton } from './components/PageSkeleton'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Toaster } from './components/Toaster'

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
const CheckoutPage          = lazy(() => import('./pages/checkout/Checkout'))
const OrdersPage            = lazy(() => import('./pages/Orders'))
const OrderDetailPage       = lazy(() => import('./pages/OrderDetail'))
const PrescriptionsPage     = lazy(() => import('./pages/Prescriptions'))
const ProfilePage           = lazy(() => import('./pages/Profile'))
const NotificationsPage     = lazy(() => import('./pages/Notifications'))
const AppointmentsPage      = lazy(() => import('./pages/appointments/Appointments'))
const AppointmentDetailPage = lazy(() => import('./pages/appointments/AppointmentDetail'))

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
          <Route path="/checkout/*"         element={<CheckoutPage />} />
          <Route path="/orders"             element={<OrdersPage />} />
          <Route path="/orders/:id"         element={<OrderDetailPage />} />
          <Route path="/prescriptions"      element={<PrescriptionsPage />} />
          <Route path="/profile"            element={<ProfilePage />} />
          <Route path="/notifications"      element={<NotificationsPage />} />
          <Route path="/appointments"       element={<AppointmentsPage />} />
          <Route path="/appointments/:id"   element={<AppointmentDetailPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />

      </Routes>
    </AnimatePresence>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster />
      <Suspense fallback={<PageSkeleton />}>
        <AnimatedRoutes />
      </Suspense>
    </BrowserRouter>
  )
}
