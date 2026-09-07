import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { Loader2, LogIn, Tractor } from 'lucide-react'
import { login } from '../store/slices/authSlice'

export default function Login() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-farm-100 via-farm-50 to-harvest-100 px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-2.5">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-700 text-white shadow-soft">
            <Tractor size={26} />
          </span>
          <div>
            <p className="text-xl font-bold text-stone-800">Stok Emanet</p>
            <p className="text-sm text-stone-500">Tarımsal Takip Sistemi</p>
          </div>
        </div>

        <div className="card p-6 sm:p-8">
          <h1 className="mb-6 text-center text-2xl font-bold text-stone-800">Giriş Yap</h1>
          {error && <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
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
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
              Giriş Yap
            </button>
          </form>
          <p className="mt-5 text-center text-sm text-stone-500">
            Hesabın yok mu?{' '}
            <Link to="/register" className="font-semibold text-green-700 hover:underline">
              Kayıt Ol
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}