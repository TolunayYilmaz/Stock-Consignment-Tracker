import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AlertCircle, BadgeCheck, Tractor } from 'lucide-react'
import api from '../api/client'
import TireLoader from '../components/ui/TireLoader'

export default function VerifyEmail() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    let cancelled = false
    const verify = async () => {
      if (!token) {
        setStatus('error')
        return
      }
      try {
        await api.get('/verify-email', { params: { token } })
        if (cancelled) return
        setStatus('success')
        setTimeout(() => navigate('/login', { replace: true, state: { verified: true } }), 1600)
      } catch (err) {
        if (cancelled) return
        setStatus('error')
      }
    }
    verify()
    return () => {
      cancelled = true
    }
  }, [token, navigate])

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
          <h1 className="mb-6 text-center text-2xl font-bold text-stone-800">E-posta Doğrulama</h1>

          {status === 'loading' && (
            <div className="flex flex-col items-center gap-3 py-6">
              <TireLoader className="h-[30px] w-[30px]" />
              <p className="text-sm text-stone-500">E-postanız doğrulanıyor...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-3 rounded-2xl border border-green-200 bg-green-50 px-4 py-6 text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-green-600 text-white">
                  <BadgeCheck size={28} />
                </span>
                <p className="text-lg font-semibold text-green-800">E-postanız başarıyla doğrulandı</p>
                <p className="text-sm text-green-700">Giriş sayfasına yönlendiriliyorsunuz...</p>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-6 text-center">
              <AlertCircle size={28} className="text-amber-600" />
              <p className="text-sm font-medium text-amber-800">
                Doğrulama bağlantısı geçersiz veya kullanılmış. Yeni bir doğrulama e-postası talep etmeniz gerekebilir.
              </p>
              <button
                onClick={() => navigate('/login', { replace: true })}
                className="mt-2 inline-flex items-center justify-center rounded-xl bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700"
              >
                Giriş Sayfasına Dön
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}