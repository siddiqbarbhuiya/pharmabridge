import { NavLink, useNavigate, Outlet } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  LayoutDashboard, ShoppingBag, Pill, FileText, Stethoscope,
  CalendarDays, BarChart3, Settings, LogOut, ChevronRight,
} from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { usePharmacyStore } from '../stores/pharmacyStore'
import { useToastStore } from '../stores/toastStore'
import { api } from '../lib/axios'

// ── Nav items ──────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { to: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard'     },
  { to: '/orders',       icon: ShoppingBag,     label: 'Orders'        },
  { to: '/medicines',    icon: Pill,            label: 'Medicines'     },
  { to: '/prescriptions',icon: FileText,        label: 'Prescriptions' },
  { to: '/doctors',      icon: Stethoscope,     label: 'Doctors'       },
  { to: '/appointments', icon: CalendarDays,    label: 'Appointments'  },
  { to: '/analytics',    icon: BarChart3,       label: 'Analytics'     },
  { to: '/profile',      icon: Settings,        label: 'Settings'      },
] as const

// Mobile bottom nav shows only 5 primary items
const BOTTOM_NAV = [
  { to: '/dashboard',    icon: LayoutDashboard, label: 'Home'     },
  { to: '/orders',       icon: ShoppingBag,     label: 'Orders'   },
  { to: '/medicines',    icon: Pill,            label: 'Medicines'},
  { to: '/appointments', icon: CalendarDays,    label: 'Appts'    },
  { to: '/profile',      icon: Settings,        label: 'Settings' },
] as const

// ── IsOpen Toggle ──────────────────────────────────────────────────────────

function OpenToggle() {
  const { pharmacyData, setIsOpen } = usePharmacyStore()
  const push = useToastStore((s) => s.push)
  const queryClient = useQueryClient()

  const toggleMutation = useMutation({
    mutationFn: async () => {
      const res = await api.patch('/pharmacy/profile/toggle')
      return res.data.data as { isActive: boolean }
    },
    onSuccess: (data) => {
      setIsOpen(data.isActive)
      queryClient.invalidateQueries({ queryKey: ['pharmacy-profile'] })
      push('success', data.isActive ? 'Pharmacy is now open' : 'Pharmacy is now closed')
    },
    onError: () => push('error', 'Failed to update status'),
  })

  const isOpen = pharmacyData?.isActive ?? false

  return (
    <button
      onClick={() => toggleMutation.mutate()}
      disabled={toggleMutation.isPending}
      className={`flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl transition-colors ${
        isOpen
          ? 'bg-mint border border-rx/20 text-rx'
          : 'bg-bone border border-line text-ink/50'
      }`}
    >
      <div className={`w-8 h-4 rounded-full flex items-center px-0.5 transition-colors ${
        isOpen ? 'bg-rx' : 'bg-line'
      }`}>
        <div className={`w-3 h-3 rounded-full bg-paper shadow-sm transition-transform ${
          isOpen ? 'translate-x-4' : 'translate-x-0'
        }`} />
      </div>
      <span className="text-xs font-medium flex-1 text-left">
        {toggleMutation.isPending ? 'Updating…' : isOpen ? 'Open' : 'Closed'}
      </span>
    </button>
  )
}

// ── Sidebar ────────────────────────────────────────────────────────────────

function Sidebar() {
  const { user, logout } = useAuthStore()
  const { pharmacyData, clearPharmacy } = usePharmacyStore()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    clearPharmacy()
    navigate('/auth/login', { replace: true })
  }

  return (
    <aside className="hidden lg:flex flex-col fixed inset-y-0 left-0 w-60 bg-paper border-r border-line z-30">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-line">
        <p className="font-display font-semibold text-ink text-[17px] tracking-tight leading-none">
          PharmaBridge
        </p>
        <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-rx mt-1">
          Pharmacy Panel
        </p>
      </div>

      {/* Pharmacy name */}
      {pharmacyData && (
        <div className="px-5 py-3 border-b border-line">
          <p className="text-xs text-ink/40 font-mono uppercase tracking-widest mb-1">Active Store</p>
          <p className="text-sm font-medium text-ink truncate">{pharmacyData.name}</p>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-ink text-paper'
                  : 'text-ink/60 hover:text-ink hover:bg-bone'
              }`
            }
          >
            <Icon size={16} className="shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Bottom section */}
      <div className="px-3 py-3 border-t border-line space-y-2">
        <OpenToggle />
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-ink/50 hover:text-red-500 hover:bg-red-50 transition-colors"
        >
          <LogOut size={16} className="shrink-0" />
          Sign out
        </button>
      </div>
    </aside>
  )
}

// ── Bottom Nav (mobile) ────────────────────────────────────────────────────

function BottomNav() {
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-paper border-t border-line">
      <div className="flex">
        {BOTTOM_NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center gap-1 py-3 text-[10px] font-medium transition-colors ${
                isActive ? 'text-ink' : 'text-ink/35 hover:text-ink/60'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={20} className={isActive ? 'text-rx' : ''} />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

// ── TopBar (mobile) ────────────────────────────────────────────────────────

function TopBar() {
  const { pharmacyData } = usePharmacyStore()

  return (
    <header className="lg:hidden sticky top-0 z-20 bg-paper/90 backdrop-blur-sm border-b border-line px-4 h-14 flex items-center justify-between">
      <div>
        <p className="font-display font-semibold text-ink text-base tracking-tight leading-none">
          PharmaBridge
        </p>
        {pharmacyData && (
          <p className="text-[10px] text-ink/40 font-mono truncate max-w-[180px]">{pharmacyData.name}</p>
        )}
      </div>
      <OpenToggle />
    </header>
  )
}

// ── Layout ─────────────────────────────────────────────────────────────────

export default function Layout() {
  const pharmacyId = useAuthStore((s) => s.pharmacyId)
  const { setPharmacyData } = usePharmacyStore()

  // Bootstrap pharmacy data on every layout mount
  useQuery({
    queryKey: ['pharmacy-profile'],
    queryFn: async () => {
      const res = await api.get('/pharmacy/profile')
      const data = res.data.data
      setPharmacyData(data)
      return data
    },
    enabled: !!pharmacyId,
    staleTime: 60_000,
  })

  return (
    <div className="min-h-screen bg-bone">
      <Sidebar />
      <TopBar />
      <main className="lg:ml-60 pb-20 lg:pb-0">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
