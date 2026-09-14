import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { AlertCircle, CheckCircle2, LogIn, Tractor } from 'lucide-react'
import { login } from '../store/slices/authSlice'
import TireLoader from '../components/ui/TireLoader'

export default function Login() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const verified = location.state?.verified

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await dispatch(login({ email, password })).unwrap()
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.detail || 'Giriş başarısız')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-farm-100 via-farm-50 to-harvest-100 px-4 dark:from-stone-950 dark:via-stone-950 dark:to-stone-950">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-2.5">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-700 text-white shadow-soft">
            <Tractor size={26} />
          </span>
          <div>
            <p className="text-xl font-bold text-stone-800 dark:text-stone-100">Stok Emanet</p>
            <p className="text-sm text-stone-500 dark:text-stone-400">Tarımsal Takip Sistemi</p>
          </div>
        </div>

        <div className="card p-6 sm:p-8">
          <h1 className="mb-6 text-center text-2xl font-bold text-stone-800 dark:text-stone-100">Giriş Yap</h1>
          {verified && (
            <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-900/40 dark:bg-green-900/30 dark:text-green-400">
              <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
              <span>E-postanız başarıyla doğrulandı. Artık giriş yapabilirsiniz.</span>
            </div>
          )}
          {error && (
            <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/30 dark:text-amber-400">
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="label">E-posta</label>
              <input
                type="email"
                placeholder="ornek@mail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="label">Şifre</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                required
              />
            </div>
            <button type="submit" disabled={submitting} className="btn-primary w-full">
              {submitting ? <TireLoader className="h-4 w-4" /> : <LogIn size={16} />}
              Giriş Yap
            </button>
          </form>
          <p className="mt-3 text-center text-sm">
            <Link to="/forgot-password" className="font-semibold text-green-700 hover:underline dark:text-green-500">
              Şifremi Unuttum
            </Link>
          </p>
          <p className="mt-5 text-center text-sm text-stone-500 dark:text-stone-400">
            Hesabın yok mu?{' '}
            <Link to="/register" className="font-semibold text-green-700 hover:underline dark:text-green-500">
              Kayıt Ol
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}