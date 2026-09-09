import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, CheckCircle2, KeyRound, Loader2, Mail, Tractor } from 'lucide-react'
import api from '../api/client'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSubmitting(true)
    try {
      const res = await api.post('/auth/forgot-password', { email: email.trim() })
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
          <h1 className="mb-6 text-center text-2xl font-bold text-stone-800">Şifremi Unuttum</h1>
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
                Giriş Sayfasına Dön
              </Link>
            </div>
          ) : (
            <div>
              <p className="mb-4 text-center text-sm text-stone-500">
                E-posta adresinizi girin, size şifre sıfırlama bağlantısı gönderelim.
              </p>
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
                <button type="submit" disabled={submitting} className="btn-primary w-full">
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
                  Sıfırlama Bağlantısı Gönder
                </button>
              </form>
              <p className="mt-5 text-center text-sm text-stone-500">
                Şifreni hatırlıyor musun?{' '}
                <Link to="/login" className="font-semibold text-green-700 hover:underline">
                  Giriş Yap
                </Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
