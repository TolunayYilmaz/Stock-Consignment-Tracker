import { Navigate } from 'react-router-dom'
import { useSelector } from 'react-redux'

export default function AdminRoute({ children }) {
  const user = useSelector((state) => state.auth.user)

  // Gizli rota: yetkisi olmayanı Dashboard'a geri gönder (link/buton asla görünmez)
  if (!user?.is_admin) {
    return <Navigate to="/" replace />
  }

  return children
}