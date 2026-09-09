import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { BadgeCheck, CheckCircle2, Clock, Eye, KeyRound, Loader2, ShieldCheck, Trash2, ShieldOff, X } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import UserDetailModal from '../components/UserDetailModal'
import api from '../api/client'

const fmtDate = (d) => new Date(d).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })

export default function Admin() {
  const user = useSelector((state) => state.auth.user)
  const navigate = useNavigate()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [detailUser, setDetailUser] = useState(null)
  const [resetTarget, setResetTarget] = useState(null)
  const [resetting, setResetting] = useState(false)
  const [resetPassword, setResetPassword] = useState('')

  useEffect(() => {
    if (!user?.is_admin) {
      navigate('/', { replace: true })
      return
    }
    api
      .get('/admin/users')
      .then((res) => setUsers(res.data))
      .catch((err) => setError(err.response?.data?.detail || 'Kullanıcılar alınamadı'))
      .finally(() => setLoading(false))
  }, [user, navigate])

  const onApprove = async (target) => {
    setError('')
    try {
      await api.patch(`/admin/users/${target.id}/approve`)
      setUsers((prev) => prev.map((u) => (u.id === target.id ? { ...u, is_approved: true } : u)))
    } catch (err) {
      setError(err.response?.data?.detail || 'Onaylama başarısız')
    }
  }

  const onDelete = async (target) => {
    if (!window.confirm(`${target.email} kullanıcısını silmek istediğinize emin misiniz?`)) return
    setError('')
    try {
      await api.delete(`/admin/users/${target.id}`)
      setUsers((prev) => prev.filter((u) => u.id !== target.id))
    } catch (err) {
      setError(err.response?.data?.detail || 'Silme başarısız')
    }
  }

  const onResetPassword = async () => {
    if (!resetTarget) return
    setError('')
    setResetting(true)
    try {
      const res = await api.post(`/admin/users/${resetTarget.id}/reset-password`, { send_email: false })
      setResetPassword(res.data.temporary_password)
      setResetting(false)
    } catch (err) {
      setResetTarget(null)
      setResetting(false)
      setError(err.response?.data?.detail || 'Şifre sıfırlama başarısız')
    }
  }

  const closeReset = () => {
    setResetTarget(null)
    setResetPassword('')
    setResetting(false)
  }

  return (
    <div>
      <PageHeader icon={ShieldCheck} title="Kullanıcı Yönetimi" subtitle="Gizli yönetim paneli" />

      {error && <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <div className="card overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center p-10">
            <Loader2 className="animate-spin text-green-700" />
          </div>
        ) : (
          <table className="w-full min-w-[920px] text-sm">
            <thead>
              <tr className="border-b border-stone-100 bg-stone-50">
                <th className="th">E-posta</th>
                <th className="th">Kayıt Tarihi</th>
                <th className="th">Yetki</th>
                <th className="th">Durum</th>
                <th className="th">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-stone-50 hover:bg-farm-50/50">
                  <td className="td font-semibold text-stone-800">{u.email}</td>
                  <td className="td">{fmtDate(u.created_at)}</td>
                  <td className="td">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        u.is_admin ? 'bg-green-100 text-green-700' : 'bg-stone-100 text-stone-500'
                      }`}
                    >
                      {u.is_admin ? <ShieldCheck size={12} /> : <ShieldOff size={12} />}
                      {u.is_admin ? 'Yönetici' : 'Üye'}
                    </span>
                  </td>
                  <td className="td">
                    <div className="flex flex-col items-start gap-1.5">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          u.is_verified ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        <BadgeCheck size={12} />
                        {u.is_verified ? 'Doğrulandı' : 'Doğrulanmadı'}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          u.is_approved ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {u.is_approved ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                        {u.is_approved ? 'Onaylı' : 'Onay Bekliyor'}
                      </span>
                    </div>
                  </td>
                  <td className="td">
                    <div className="flex items-center gap-2">
                      {!u.is_approved && u.id !== user.id && (
                        <button
                          onClick={() => onApprove(u)}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-green-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-green-700"
                          title="Kullanıcıyı onayla"
                        >
                          <CheckCircle2 size={14} />
                          Onayla
                        </button>
                      )}
                      <button
                        onClick={() => setDetailUser(u)}
                        className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold text-green-700 transition hover:bg-green-50"
                        title="Kullanıcı detayını görüntüle"
                      >
                        <Eye size={14} />
                        Detay Gör
                      </button>
                      <button
                        onClick={() => setResetTarget(u)}
                        disabled={u.id === user.id}
                        className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold text-amber-600 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-40"
                        title={u.id === user.id ? 'Kendi şifrenizi buradan sıfırlayamazsınız' : 'Kullanıcı şifresini sıfırla'}
                      >
                        <KeyRound size={14} />
                        Şifreyi Sıfırla
                      </button>
                      <button
                        onClick={() => onDelete(u)}
                        disabled={u.id === user.id}
                        className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                        title={u.id === user.id ? 'Kendi hesabınızı silemezsiniz' : 'Kullanıcıyı sil'}
                      >
                        <Trash2 size={14} />
                        Sil
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {detailUser && <UserDetailModal user={detailUser} onClose={() => setDetailUser(null)} />}

      {resetTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-stone-900/50 backdrop-blur-sm" onClick={closeReset} />
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <button
              onClick={closeReset}
              className="absolute right-4 top-4 rounded-lg p-1 text-stone-400 transition hover:bg-stone-100 hover:text-stone-600"
              aria-label="Kapat"
            >
              <X size={18} />
            </button>
            {resetPassword ? (
              <div>
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                  <KeyRound className="text-green-600" size={22} />
                </div>
                <h3 className="text-center text-lg font-semibold text-stone-800">Şifre Sıfırlandı</h3>
                <p className="mt-2 text-center text-sm text-stone-500">
                  <span className="font-semibold text-stone-700">{resetTarget.email}</span> kullanıcısı için geçici şifre:
                </p>
                <div className="mt-4 rounded-xl bg-stone-50 px-4 py-3 text-center">
                  <code className="text-lg font-bold tracking-wide text-green-700">{resetPassword}</code>
                </div>
                <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-center text-xs text-amber-800">
                  Bu şifreyi kullanıcıya güvenli bir şekilde iletin. Kullanıcı bu şifreyle giriş yapabilir.
                </p>
                <button onClick={closeReset} className="btn-primary mt-5 w-full">
                  Tamam
                </button>
              </div>
            ) : (
              <div>
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
                  <KeyRound className="text-amber-600" size={22} />
                </div>
                <h3 className="text-center text-lg font-semibold text-stone-800">Şifreyi Sıfırla</h3>
                <p className="mt-2 text-center text-sm text-stone-500">
                  <span className="font-semibold text-stone-700">{resetTarget.email}</span> kullanıcısının şifresi
                  sistem tarafından otomatik oluşturulan geçici bir şifre ile değiştirilecek. Devam etmek istiyor
                  musunuz?
                </p>
                <div className="mt-6 grid grid-cols-2 gap-3">
                  <button
                    onClick={closeReset}
                    disabled={resetting}
                    className="rounded-xl border border-stone-200 px-4 py-2.5 text-sm font-semibold text-stone-600 transition hover:bg-stone-50 disabled:opacity-60"
                  >
                    Vazgeç
                  </button>
                  <button
                    onClick={onResetPassword}
                    disabled={resetting}
                    className="flex items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:opacity-60"
                  >
                    {resetting && <Loader2 className="animate-spin" size={16} />}
                    Evet, Sıfırla
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}