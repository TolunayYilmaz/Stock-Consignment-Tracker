import { useEffect, useState } from 'react'
import { Package, TrendingUp, TrendingDown, Warehouse, X } from 'lucide-react'
import TireLoader from './ui/TireLoader'
import api from '../api/client'
import ProductBadge from './ProductBadge'

const safeNum = (n) => (Number.isFinite(Number(n)) ? Number(n) : 0)
const fmt = (n, max = 3) => safeNum(n).toLocaleString('tr-TR', { maximumFractionDigits: max })
const fmtMoney = (n) => `${safeNum(n).toLocaleString('tr-TR', { maximumFractionDigits: 2 })} ₺`

export default function UserDetailModal({ user, onClose }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) return
    setLoading(true)
    setError('')
    api
      .get(`/admin/users/${user.id}/dashboard`)
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.detail || 'Kullanıcı özeti alınamadı'))
      .finally(() => setLoading(false))
  }, [user])

  const totalProfit = safeNum(data?.total_profit_loss)

  const stats = [
    {
      label: 'Toplam Kâr/Zarar',
      value: fmtMoney(totalProfit),
      sub: totalProfit < 0 ? 'Zararda' : 'Kârda',
      icon: totalProfit >= 0 ? TrendingUp : TrendingDown,
      cls: totalProfit >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600',
    },
    {
      label: 'Toplam Stok',
      value: `${fmt(data?.total_physical_stock)} ton`,
      sub: 'Depoda kalan ürün',
      icon: Warehouse,
      cls: 'bg-amber-100 text-amber-700',
    },
    {
      label: 'Toplam Emanet',
      value: `${fmt(data?.total_emanet)} ton`,
      sub: 'Emanette bekleyen',
      icon: Package,
      cls: 'bg-farm-100 text-green-700',
    },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-stone-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-stone-100 bg-green-700 px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-white">Kullanıcı Detayı</h2>
            <p className="text-sm text-white/70">{user?.email}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-white/70 transition hover:bg-white/10 hover:text-white"
            aria-label="Kapat"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <TireLoader className="h-6 w-6" />
            </div>
          ) : error ? (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
          ) : (
            <div>
              <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                {stats.map((s) => (
                  <div key={s.label} className="card p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm text-stone-500">{s.label}</p>
                        <p className={`mt-1 text-xl font-bold ${totalProfit >= 0 && s.label === 'Toplam Kâr/Zarar' ? 'text-green-700' : 'text-stone-800'}`}>
                          {s.value}
                        </p>
                        <p className="mt-0.5 text-xs text-stone-400">{s.sub}</p>
                      </div>
                      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${s.cls}`}>
                        <s.icon size={20} />
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <h3 className="mb-3 text-base font-semibold text-stone-800">Ürün Bazlı Stok Dağılımı</h3>
              <div className="card overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="border-b border-stone-100 bg-stone-50">
                      <th className="th">Ürün</th>
                      <th className="th">Güncel Stok (ton)</th>
                      <th className="th">Emanet (ton)</th>
                      <th className="th">Satılan (ton)</th>
                      <th className="th">Kâr/Zarar (₺)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.rows.map((r) => (
                      <tr key={r.product_name} className="border-b border-stone-50 hover:bg-farm-50/50">
                        <td className="td">
                          <ProductBadge product={r.product_name} />
                        </td>
                        <td className={`td font-semibold ${r.physical_stock < 0 ? 'text-red-600' : ''}`}>
                          {fmt(r.physical_stock)}
                        </td>
                        <td className="td">{fmt(r.emanet_balance)}</td>
                        <td className="td">{fmt(r.sold_quantity)}</td>
                        <td className={`td font-semibold ${r.profit_loss >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                          {fmt(r.profit_loss, 2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {data.rows.length === 0 && <p className="p-4 text-stone-500">Bu kullanıcının henüz kaydı yok.</p>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
