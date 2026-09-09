import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AlertCircle, CheckCircle2, KeyRound, Loader2, Lock, Tractor } from 'lucide-react'
import api from '../api/client'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!token) {
      setError('Geçersiz sıfırlama linki. Lütfen e-postanızdaki bağlantıyı kullanın.')
    }
  }, [token])

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (newPassword.length < 6) {
      setError('Şifre en az 6 karakter olmalıdır')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Şifreler eşleşmiyor')
      return
    }
    setSubmitting(true)
    try {
      const res = await api.post('/auth/reset-password', { token, new_password: newPassword })
      setSuccess(res.data.detail)
    } catch (err) {
      setError(err.response?.data?.detail || 'Bir hata oluştu')
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
          <h1 className="mb-6 text-center text-2xl font-bold text-stone-800">Yeni Şifre Belirle</h1>
          {error && (
            <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {success ? (
            <div className="space-y-4">
              <div className="flex items-start gap-2.5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
                <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
                <span>{success}</span>
              </div>
              <Link to="/login" className="btn-primary flex w-full items-center justify-center gap-2">
                Giriş Yap
              </Link>
            </div>
          ) : token ? (
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="label">Yeni Şifre (en az 6 karakter)</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="input-field"
                  minLength={6}
                  required
                />
              </div>
              <div>
                <label className="label">Yeni Şifre (Tekrar)</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input-field"
                  minLength={6}
                  required
                />
              </div>
              <button type="submit" disabled={submitting} className="btn-primary w-full">
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
                Şifremi Güncelle
              </button>
            </form>
          ) : (
            <div className="text-center">
              <Link to="/forgot-password" className="font-semibold text-green-700 hover:underline">
                Yeni sıfırlama linki talep et
              </Link>
            </div>
          )}
          <p className="mt-5 text-center text-sm text-stone-500">
            <Link to="/login" className="font-semibold text-green-700 hover:underline">
              Giriş Sayfasına Dön
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
