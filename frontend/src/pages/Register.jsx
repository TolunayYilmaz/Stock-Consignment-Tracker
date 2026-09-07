import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Loader2, Tractor, UserPlus } from 'lucide-react'
import api from '../api/client'

export default function Register() {
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
      await api.post('/register', { email: email.trim(), password })
      navigate('/login')
    } catch (err) {
      setError(err.response?.data?.detail || 'Kayıt başarısız')
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
          <h1 className="mb-6 text-center text-2xl font-bold text-stone-800">Kayıt Ol</h1>
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
              <label className="label">Şifre (en az 6 karakter)</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                minLength={6}
                required
              />
            </div>
            <button type="submit" disabled={submitting} className="btn-primary w-full">
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
              Kayıt Ol
            </button>
          </form>
          <p className="mt-5 text-center text-sm text-stone-500">
            Zaten hesabın var mı?{' '}
            <Link to="/login" className="font-semibold text-green-700 hover:underline">
              Giriş Yap
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}