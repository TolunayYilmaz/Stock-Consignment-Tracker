import { useState } from 'react'
import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import {
  ArrowLeftRight,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  ShoppingCart,
  Sun,
  Tractor,
  Users,
  X,
} from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { logout } from '../store/slices/authSlice'

const NAV_ITEMS = [
  { to: '/', label: 'Ana Sayfa', icon: LayoutDashboard, end: true },
  { to: '/customers', label: 'Müşteriler', icon: Users, end: false },
  { to: '/transactions', label: 'İşlemler', icon: ArrowLeftRight, end: false },
  { to: '/sales', label: 'Satışlar', icon: ShoppingCart, end: false },
]

export default function Layout() {
  const [open, setOpen] = useState(false)
  const user = useSelector((state) => state.auth.user)
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { isDark, toggleTheme } = useTheme()

  const onLogout = async () => {
    await dispatch(logout())
    navigate('/login')
  }

  const navLinkCls = ({ isActive }) =>
    `flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition ${
      isActive
        ? 'bg-green-700 text-white shadow-sm'
        : 'text-stone-600 hover:bg-farm-100 hover:text-green-800 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-green-400'
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
    <div className="min-h-screen bg-farm-50 dark:bg-stone-950">
      <header className="sticky top-0 z-20 border-b border-stone-100 bg-white/90 backdrop-blur dark:border-stone-800 dark:bg-stone-900/90">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5 cursor-pointer transition-all duration-200 hover:opacity-80 hover:scale-[1.02] active:scale-95">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-700 text-white shadow-sm">
              <Tractor size={20} />
            </span>
            <div className="leading-tight">
              <p className="text-sm font-bold text-stone-800 dark:text-stone-100 sm:text-base">
                {user?.company_name?.trim() || 'Stok Emanet'}
              </p>
              <p className="hidden text-[11px] text-stone-400 dark:text-stone-500 sm:block">Tarımsal Takip Sistemi</p>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">{item}</nav>

          <div className="flex items-center gap-2">
            <div className="hidden text-right sm:block">
              <p className="max-w-[180px] truncate text-xs font-semibold text-stone-700 dark:text-stone-300">{user?.email}</p>
              <p className="text-[11px] text-stone-400 dark:text-stone-500">
                {user?.is_admin ? 'Yönetici' : 'Üye'}
              </p>
            </div>
            <button
              onClick={toggleTheme}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-stone-500 transition hover:bg-stone-100 hover:text-stone-700 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-200"
              title={isDark ? 'Açık tema' : 'Karanlık tema'}
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-stone-500 transition hover:bg-red-50 hover:text-red-600 dark:text-stone-400 dark:hover:bg-red-950 dark:hover:text-red-400"
              title="Çıkış yap"
            >
              <LogOut size={17} />
              <span className="hidden lg:inline">Çıkış</span>
            </button>
            <button
              onClick={() => setOpen((v) => !v)}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-stone-600 hover:bg-farm-100 dark:text-stone-400 dark:hover:bg-stone-800 md:hidden"
            >
              {open ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {open && (
          <nav className="border-t border-stone-100 bg-white px-4 py-3 dark:border-stone-800 dark:bg-stone-900 md:hidden">
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
