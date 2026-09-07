import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import {
  ArrowLeftRight,
  LayoutDashboard,
  LogOut,
  Menu,
  ShoppingCart,
  Tractor,
  Users,
  X,
} from 'lucide-react'
import { logout } from '../store/slices/authSlice'

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/customers', label: 'Müşteriler', icon: Users, end: false },
  { to: '/transactions', label: 'İşlemler', icon: ArrowLeftRight, end: false },
  { to: '/sales', label: 'Satışlar', icon: ShoppingCart, end: false },
]

export default function Layout() {
  const [open, setOpen] = useState(false)
  const user = useSelector((state) => state.auth.user)
  const dispatch = useDispatch()
  const navigate = useNavigate()

  const onLogout = async () => {
    await dispatch(logout())
    navigate('/login')
  }

  const navLinkCls = ({ isActive }) =>
    `flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition ${
      isActive
        ? 'bg-green-700 text-white shadow-sm'
        : 'text-stone-600 hover:bg-farm-100 hover:text-green-800'
    }`

  const item = (
    <>
      {NAV_ITEMS.map((it) => (
        <NavLink key={it.to} to={it.to} end={it.end} className={navLinkCls} onClick={() => setOpen(false)}>
          <it.icon size={17} />
          {it.label}
        </NavLink>
      ))}
    </>
  )

  return (
    <div className="min-h-screen bg-farm-50">
      <header className="sticky top-0 z-20 border-b border-stone-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-700 text-white shadow-sm">
              <Tractor size={20} />
            </span>
            <div className="leading-tight">
              <p className="text-sm font-bold text-stone-800 sm:text-base">Stok Emanet</p>
              <p className="hidden text-[11px] text-stone-400 sm:block">Tarımsal Takip Sistemi</p>
            </div>
          </div>

          <nav className="hidden items-center gap-1 md:flex">{item}</nav>

          <div className="flex items-center gap-2">
            <div className="hidden text-right sm:block">
              <p className="max-w-[180px] truncate text-xs font-semibold text-stone-700">{user?.email}</p>
              <p className="text-[11px] text-stone-400">
                {user?.is_admin ? 'Yönetici' : 'Üye'}
              </p>
            </div>
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-stone-500 transition hover:bg-red-50 hover:text-red-600"
              title="Çıkış yap"
            >
              <LogOut size={17} />
              <span className="hidden lg:inline">Çıkış</span>
            </button>
            <button
              onClick={() => setOpen((v) => !v)}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-stone-600 hover:bg-farm-100 md:hidden"
            >
              {open ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {open && (
          <nav className="border-t border-stone-100 bg-white px-4 py-3 md:hidden">
            <div className="flex flex-col gap-1">{item}</div>
          </nav>
        )}
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <Outlet />
      </main>
    </div>
  )
}