import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertCircle, CheckCircle2, CheckSquare, FileText, Loader2, LogIn, Tractor, UserPlus, X } from 'lucide-react'
import api from '../api/client'

export default function Register() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [kvkk, setKvkk] = useState(false)
  const [kvkkOpen, setKvkkOpen] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const onSubmit = async (e) => {
    e.preventDefault()
    if (!kvkk) {
      setError('Devam edebilmek için KVKK Aydınlatma Metni\'ni onaylamanız gerekmektedir.')
      return
    }
    setError('')
    setSuccess('')
    setSubmitting(true)
    try {
      const res = await api.post('/register', { email: email.trim(), password })
      if (res.data.is_verified && res.data.is_approved) {
        navigate('/login')
      } else {
        setSuccess(
          'Hesabınız oluşturuldu. Lütfen e-posta adresinize gönderdiğimiz doğrulama linkine tıklayarak hesabınızı doğrulayın.'
        )
      }
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
              <button type="button" onClick={() => navigate('/login')} className="btn-primary w-full">
                <LogIn size={16} />
                Giriş Yap
              </button>
            </div>
          ) : (
            <div>
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
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-stone-200 bg-stone-50 px-3 py-3 text-sm transition hover:border-green-300">
              <input
                type="checkbox"
                checked={kvkk}
                onChange={(e) => setKvkk(e.target.checked)}
                required
                className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-green-700"
              />
              <span className="text-stone-600">
                <button
                  type="button"
                  onClick={() => setKvkkOpen(true)}
                  className="font-semibold text-green-700 underline transition hover:text-green-800"
                >
                  KVKK Aydınlatma Metni
                </button>
                {' '}okudum ve onaylıyorum.
              </span>
            </label>
            <button type="submit" disabled={submitting || !kvkk} className="btn-primary w-full">
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
          )}
        </div>
      </div>

      {kvkkOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-stone-900/50 backdrop-blur-sm" onClick={() => setKvkkOpen(false)} />
          <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-stone-100 bg-green-700 px-5 py-4">
              <div className="flex items-center gap-2 text-white">
                <FileText size={20} />
                <h2 className="text-lg font-bold">KVKK Aydınlatma Metni</h2>
              </div>
              <button
                type="button"
                onClick={() => setKvkkOpen(false)}
                className="rounded-lg p-1 text-white/70 transition hover:bg-white/10 hover:text-white"
                aria-label="Kapat"
              >
                <X size={20} />
              </button>
            </div>
            <div className="max-h-[60vh] space-y-3 overflow-y-auto px-5 py-5 text-sm leading-relaxed text-stone-600">
              <p>
                6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) uyarınca, tarafımızca yürütülen
                tarımsal stok ve emanet takip sistemi kapsamında verileriniz işlenmektedir.
              </p>
              <p className="font-semibold text-stone-800">1. Veri Sorumlusu</p>
              <p>
                Kişisel verileriniz, veri sorumlusu sıfatıyla <span className="font-semibold">Stok Emanet</span>{' '}
                tarafından aşağıda açıklanan kapsamda işlenebilmektedir.
              </p>
              <p className="font-semibold text-stone-800">2. İşlenen Kişisel Veriler</p>
              <p>E-posta adresiniz, kayıt tarihiniz ve sistem üzerinde oluşturduğunuz stok, satış ve emanet kayıtlarınız işlenmektedir.</p>
              <p className="font-semibold text-stone-800">3. İşleme Amaçları</p>
              <p>
                Verileriniz; hesap oluşturma, kimlik doğrulama, ürün stok ve emanet takibinin sağlanması,
                talep ve şikayetlerinizin yanıtlanması ile yasal yükümlülüklerin yerine getirilmesi amaçlarıyla işlenmektedir.
              </p>
              <p className="font-semibold text-stone-800">4. Verilerin Aktarılması</p>
              <p>
                Kişisel verileriniz, kanuni zorunluluklar ve ilgili mevzuat hükümleri dışında üçüncü kişilerle paylaşılmamaktadır.
              </p>
              <p className="font-semibold text-stone-800">5. Haklarınız</p>
              <p>
                KVKK'nın 11. maddesi kapsamında; verilerinizin işlenip işlenmediğini öğrenme, düzeltilmesini veya
                silinmesini talep etme, işlemeye itiraz etme ve zararın giderilmesini isteme haklarına sahipsiniz.
              </p>
              <p>
                Aydınlatma metnini okuduğunuz ve onayladığınız için teşekkür ederiz.
              </p>
            </div>
            <div className="border-t border-stone-100 bg-stone-50 px-5 py-4">
              <button
                type="button"
                onClick={() => { setKvkk(true); setKvkkOpen(false) }}
                className="btn-primary w-full"
              >
                <CheckSquare size={16} />
                Okudum, Onaylıyorum
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}