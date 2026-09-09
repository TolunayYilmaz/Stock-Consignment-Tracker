import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertCircle, Building2, CheckCircle2, CheckSquare, FileText, LogIn, Phone, Tractor, UserPlus, X } from 'lucide-react'
import api from '../api/client'
import TireLoader from '../components/ui/TireLoader'

const PASSWORD_RULES = [
  { key: 'length', label: 'En az 8 karakter', test: (v) => v.length >= 8 },
  { key: 'upper', label: 'En az 1 büyük harf', test: (v) => /[A-Z]/.test(v) },
  { key: 'digit', label: 'En az 1 rakam', test: (v) => /\d/.test(v) },
]

export default function Register() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [terms, setTerms] = useState(false)
  const [kvkkOpen, setKvkkOpen] = useState(false)
  const [termsOpen, setTermsOpen] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const onSubmit = async (e) => {
    e.preventDefault()
    if (!terms) {
      setError('Devam edebilmek için KVKK Aydınlatma Metni ve Kullanıcı Sözleşmesi\'ni onaylamanız gerekmektedir.')
      return
    }
    if (password.length < 8 || !/[A-Z]/.test(password) || !/\d/.test(password)) {
      setError('Şifre en az 8 karakter olmalı, 1 büyük harf ve 1 rakam içermelidir.')
      return
    }
    if (password !== confirmPassword) {
      setError('Şifreler eşleşmiyor.')
      return
    }
    setError('')
    setSuccess('')
    setSubmitting(true)
    try {
      const res = await api.post('/register', {
        email: email.trim(),
        password,
        phone: phone.trim() || null,
        company_name: companyName.trim() || null,
        terms_accepted: true,
      })
      if (res.data.is_verified && res.data.is_approved) {
        navigate('/login')
      } else {
        setSuccess(
          'Hesabınız oluşturuldu. Lütfen e-posta adresinize gönderdiğimiz doğrulama linkine tıklayarak hesabınızı doğrulayın.'
        )
      }
    } catch (err) {
      const detail = err.response?.data?.detail
      if (Array.isArray(detail)) {
        const msg = detail.map((d) => d.msg || d.message).filter(Boolean).join(' ')
        setError(msg || 'Kayıt başarısız')
      } else {
        setError(detail || 'Kayıt başarısız')
      }
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
              <label className="label">Şirket Adı <span className="font-normal text-stone-400">(opsiyonel)</span></label>
              <div className="relative">
                <Building2 size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  placeholder="Örn: Yılmaz Tarım A.Ş."
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="input-field pl-10"
                />
              </div>
            </div>
            <div>
              <label className="label">Telefon Numarası</label>
              <div className="relative">
                <Phone size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="tel"
                  placeholder="05XX XXX XX XX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="input-field pl-10"
                />
              </div>
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
              <div className="mt-2 grid grid-cols-1 gap-1.5">
                {PASSWORD_RULES.map((rule) => {
                  const ok = rule.test(password)
                  const active = password.length > 0
                  return (
                    <div
                      key={rule.key}
                      className={`flex items-center gap-1.5 text-xs font-medium transition ${
                        !active ? 'text-stone-400' : ok ? 'text-green-600' : 'text-stone-500'
                      }`}
                    >
                      <span
                        className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                          !active ? 'border-stone-300' : ok ? 'border-green-500 bg-green-500 text-white' : 'border-stone-300'
                        }`}
                      >
                        {ok && <CheckCircle2 size={11} />}
                      </span>
                      {rule.label}
                    </div>
                  )
                })}
              </div>
            </div>
            <div>
              <label className="label">Şifre Tekrarı</label>
              <input
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input-field"
                required
              />
              {confirmPassword.length > 0 && (
                <p className={`mt-1.5 text-xs font-medium ${password === confirmPassword ? 'text-green-600' : 'text-red-500'}`}>
                  {password === confirmPassword ? 'Şifreler eşleşiyor ✓' : 'Şifreler eşleşmiyor'}
                </p>
              )}
            </div>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-stone-200 bg-stone-50 px-3 py-3 text-sm transition hover:border-green-300">
              <input
                type="checkbox"
                checked={terms}
                onChange={(e) => setTerms(e.target.checked)}
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
                'ni ve{' '}
                <button
                  type="button"
                  onClick={() => setTermsOpen(true)}
                  className="font-semibold text-green-700 underline transition hover:text-green-800"
                >
                  Kullanıcı Sözleşmesi
                </button>
                'ni{' '}okudum, onaylıyorum.
              </span>
            </label>
            <button type="submit" disabled={submitting || !terms} className="btn-primary w-full">
              {submitting ? <TireLoader className="h-4 w-4" /> : <UserPlus size={16} />}
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
                onClick={() => { setTerms(true); setKvkkOpen(false) }}
                className="btn-primary w-full"
              >
                <CheckSquare size={16} />
                Okudum, Onaylıyorum
              </button>
            </div>
          </div>
        </div>
      )}

      {termsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-stone-900/50 backdrop-blur-sm" onClick={() => setTermsOpen(false)} />
          <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-stone-100 bg-green-700 px-5 py-4">
              <div className="flex items-center gap-2 text-white">
                <FileText size={20} />
                <h2 className="text-lg font-bold">Kullanıcı Sözleşmesi</h2>
              </div>
              <button
                type="button"
                onClick={() => setTermsOpen(false)}
                className="rounded-lg p-1 text-white/70 transition hover:bg-white/10 hover:text-white"
                aria-label="Kapat"
              >
                <X size={20} />
              </button>
            </div>
            <div className="max-h-[60vh] space-y-3 overflow-y-auto px-5 py-5 text-sm leading-relaxed text-stone-600">
              <p>
                Bu Kullanıcı Sözleşmesi ("Sözleşme"), Stok Emanet platformunun kullanımına ilişkin koşulları belirler.
                Hesap oluşturarak aşağıdaki maddeleri kabul etmiş sayılırsınız.
              </p>
              <p className="font-semibold text-stone-800">1. Veri İşleyen Statüsü</p>
              <p>
                Kullanıcılar, Stok Emanet sistemine kaydettikleri üçüncü kişilere ait kişisel veriler
                (isim, telefon, finansal kayıtlar vb.) bakımından 'Veri Sorumlusu' statüsündedir.
                Stok Emanet yalnızca 'Veri İşleyen' konumundadır.
              </p>
              <p className="font-semibold text-stone-800">2. Hukuki Sorumluluk</p>
              <p>
                Üçüncü şahıs verilerinin sisteme izinsiz veya hukuka aykırı işlenmesinden doğacak her türlü
                hukuki, idari ve cezai sorumluluk tamamen kullanıcıya aittir. Stok Emanet sorumlu tutulamaz.
              </p>
              <p className="font-semibold text-stone-800">3. Güvenlik</p>
              <p>
                Kullanıcının kendi şifresini güvenli tutmamasından veya cihazındaki zafiyetlerden kaynaklanan
                veri ihlallerinden Stok Emanet sorumlu değildir.
              </p>
            </div>
            <div className="border-t border-stone-100 bg-stone-50 px-5 py-4">
              <button
                type="button"
                onClick={() => setTermsOpen(false)}
                className="btn-primary w-full"
              >
                <CheckSquare size={16} />
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}