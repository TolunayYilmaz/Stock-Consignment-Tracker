import { Navigate, Outlet } from 'react-router-dom'
import { useSelector } from 'react-redux'
import TireLoader from './TireLoader'

export default function ProtectedRoute() {
  const { user, loading } = useSelector((state) => state.auth)

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-farm-50">
        <div className="flex items-center gap-3 rounded-2xl bg-white px-6 py-4 shadow-soft">
          <TireLoader size={22} />
          <span className="text-sm font-medium text-stone-600">Yükleniyor...</span>
        </div>
      </div>
    )
  }

  return user ? <Outlet /> : <Navigate to="/login" replace />
}