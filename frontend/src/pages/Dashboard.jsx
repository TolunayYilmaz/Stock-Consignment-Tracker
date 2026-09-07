import { useState, useEffect } from 'react'
import api from '../api/client'

function BarChart({ data }) {
  const max = Math.max(...data.map((d) => Math.abs(d.value)), 1)
  return (
    <div className="flex items-end gap-4 h-56 px-2">
      {data.map((d) => (
        <div key={d.label} className="flex flex-col items-center flex-1">
          <div className="flex-1 w-full flex items-end justify-center">
            <div
              className="w-full max-w-12 rounded-t"
              style={{
                height: `${Math.max((Math.abs(d.value) / max) * 100, 2)}%`,
                backgroundColor: d.value >= 0 ? '#16a34a' : '#dc2626',
              }}
              title={`${d.label}: ${d.value.toLocaleString('tr-TR')} ₺`}
            />
          </div>
          <span className="text-xs mt-1 text-center text-gray-600">{d.label.split(' ')[0]}</span>
        </div>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const [rows, setRows] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .get('/dashboard')
      .then((res) => setRows(res.data))
      .catch((err) => setError(err.response?.data?.detail || 'Veri alınamadı'))
  }, [])

  const totalProfit = rows.reduce((sum, r) => sum + r.profit_loss, 0)
  const totalStock = rows.reduce((sum, r) => sum + r.physical_stock, 0)
  const totalEmanet = rows.reduce((sum, r) => sum + r.emanet_balance, 0)

  const stats = [
    { label: 'Toplam Kâr/Zarar', value: totalProfit, isMoney: true },
    { label: 'Fiziksel Stok (kg)', value: totalStock, isMoney: false },
    { label: 'Müşteri Emaneti (kg)', value: totalEmanet, isMoney: false },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Kâr/Zarar Özeti</h1>
      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-lg shadow p-5">
            <p className="text-sm text-gray-500">{s.label}</p>
            <p
              className={`text-2xl font-bold ${
                s.isMoney && s.value < 0 ? 'text-red-600' : s.isMoney ? 'text-green-700' : 'text-gray-800'
              }`}
            >
              {s.isMoney ? `${s.value.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} ₺` : s.value.toLocaleString('tr-TR', { maximumFractionDigits: 3 })}
            </p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <h2 className="text-lg font-semibold mb-3">Ürün Bazlı Kâr/Zarar (₺)</h2>
        <BarChart data={rows.map((r) => ({ label: r.product_name, value: r.profit_loss }))} />
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-100 text-left">
              <th className="p-3">Ürün</th>
              <th className="p-3">Alınan (kg)</th>
              <th className="p-3">Alış Maliyeti (₺)</th>
              <th className="p-3">Ort. Alış (₺/kg)</th>
              <th className="p-3">Satılan (kg)</th>
              <th className="p-3">Ort. Satış (₺/kg)</th>
              <th className="p-3">Emanet (kg)</th>
              <th className="p-3">Güncel Stok (kg)</th>
              <th className="p-3">Kâr/Zarar (₺)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.product_name} className="border-t">
                <td className="p-3 font-medium">{r.product_name}</td>
                <td className="p-3">{r.total_purchased_quantity.toLocaleString('tr-TR')}</td>
                <td className="p-3">{r.total_purchased_amount.toLocaleString('tr-TR')}</td>
                <td className="p-3">{r.avg_buy_price.toLocaleString('tr-TR')}</td>
                <td className="p-3">{r.sold_quantity.toLocaleString('tr-TR')}</td>
                <td className="p-3">{r.avg_sell_price.toLocaleString('tr-TR')}</td>
                <td className="p-3">{r.emanet_balance.toLocaleString('tr-TR')}</td>
                <td className="p-3">{r.physical_stock.toLocaleString('tr-TR')}</td>
                <td className={`p-3 font-semibold ${r.profit_loss >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                  {r.profit_loss.toLocaleString('tr-TR')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="p-4 text-gray-500">Henüz kayıt yok.</p>}
      </div>
    </div>
  )
}