import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Loader2, ShieldCheck, Trash2, ShieldOff } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import api from '../api/client'

const fmtDate = (d) => new Date(d).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })

export default function Admin() {
  const user = useSelector((state) => state.auth.user)
  const navigate = useNavigate()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-stone-100 bg-stone-50">
                <th className="th">E-posta</th>
                <th className="th">Kayıt Tarihi</th>
                <th className="th">Yetki</th>
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
                    <button
                      onClick={() => onDelete(u)}
                      disabled={u.id === user.id}
                      className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                      title={u.id === user.id ? 'Kendi hesabınızı silemezsiniz' : 'Kullanıcıyı sil'}
                    >
                      <Trash2 size={14} />
                      Sil
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}