import { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

const LoginPage     = lazy(() => import('./pages/auth/Login'))
const DashboardPage = lazy(() => import('./pages/Dashboard'))
const OrdersPage    = lazy(() => import('./pages/Orders'))
const MedicinesPage = lazy(() => import('./pages/Medicines'))
const NotFoundPage  = lazy(() => import('./pages/NotFound'))

function Loader() {
  return (
    <div className="min-h-screen bg-bone flex items-center justify-center">
      <div className="w-8 h-8 rounded-full skeleton" />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<Loader />}>
        <Routes>
          <Route path="/auth/login" element={<LoginPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/medicines" element={<MedicinesPage />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
