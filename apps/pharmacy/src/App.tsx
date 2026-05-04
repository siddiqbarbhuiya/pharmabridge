import { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import { Toaster } from './components/Toaster'

// ── Auth ──────────────────────────────────────────────────────────────────
const LoginPage = lazy(() => import('./pages/auth/Login'))

// ── Protected pages ───────────────────────────────────────────────────────
const DashboardPage      = lazy(() => import('./pages/Dashboard'))
const OrdersPage         = lazy(() => import('./pages/Orders'))
const OrderDetailPage    = lazy(() => import('./pages/OrderDetail'))
const MedicinesPage      = lazy(() => import('./pages/Medicines'))
const MedicineAddPage    = lazy(() => import('./pages/MedicineAdd'))
const MedicineEditPage   = lazy(() => import('./pages/MedicineEdit'))
const PrescriptionsPage  = lazy(() => import('./pages/Prescriptions'))
const DoctorsPage           = lazy(() => import('./pages/doctors/Doctors'))
const DoctorAddPage         = lazy(() => import('./pages/doctors/DoctorAdd'))
const DoctorProfilePage     = lazy(() => import('./pages/doctors/DoctorProfile'))
const DoctorAvailabilityPage = lazy(() => import('./pages/doctors/DoctorAvailability'))
const AppointmentsPage   = lazy(() => import('./pages/Appointments'))
const AnalyticsPage      = lazy(() => import('./pages/Analytics'))
const ProfilePage        = lazy(() => import('./pages/Profile'))
const NotFoundPage       = lazy(() => import('./pages/NotFound'))

function PageLoader() {
  return (
    <div className="flex-1 p-6 space-y-4">
      <div className="h-8 w-48 bg-line rounded-lg animate-pulse" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 bg-paper rounded-2xl border border-line animate-pulse" />
        ))}
      </div>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public */}
          <Route path="/auth/login" element={<LoginPage />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* Protected + Layout */}
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/dashboard"                       element={<DashboardPage />} />
              <Route path="/orders"                          element={<OrdersPage />} />
              <Route path="/orders/:id"                      element={<OrderDetailPage />} />
              <Route path="/medicines"                       element={<MedicinesPage />} />
              <Route path="/medicines/add"                   element={<MedicineAddPage />} />
              <Route path="/medicines/:id/edit"              element={<MedicineEditPage />} />
              <Route path="/prescriptions"                   element={<PrescriptionsPage />} />
              <Route path="/doctors"                         element={<DoctorsPage />} />
              <Route path="/doctors/add"                     element={<DoctorAddPage />} />
              <Route path="/doctors/:id"                     element={<DoctorProfilePage />} />
              <Route path="/doctors/:id/availability"        element={<DoctorAvailabilityPage />} />
              <Route path="/appointments"                    element={<AppointmentsPage />} />
              <Route path="/analytics"                       element={<AnalyticsPage />} />
              <Route path="/profile"                         element={<ProfilePage />} />
            </Route>
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
