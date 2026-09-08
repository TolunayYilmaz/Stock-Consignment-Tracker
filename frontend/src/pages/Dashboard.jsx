import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { BarChart3, FileSpreadsheet, Loader2, Package, TrendingDown, TrendingUp, Warehouse } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import ProductBadge from '../components/ProductBadge'
import { fetchCustomers } from '../store/slices/customersSlice'
import { fetchTransactions } from '../store/slices/transactionsSlice'
import { fetchSales } from '../store/slices/salesSlice'
import { fetchDashboard } from '../store/slices/dashboardSlice'
import { store } from '../store/store'
import { exportToExcel } from '../utils/exportExcel'

const fmt = (n, max = 3) => n.toLocaleString('tr-TR', { maximumFractionDigits: max })
const fmtMoney = (n) => `${n.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} ₺`

function BarChart({ data }) {
  const max = useMemo(() => Math.max(...data.map((d) => Math.abs(d.value)), 1), [data])
  return (
    <div className="flex h-56 items-end gap-3 px-2">
      {data.map((d) => (
        <div key={d.label} className="flex flex-1 flex-col items-center">
          <div className="flex w-full flex-1 items-end justify-center">
            <div
              className="w-full max-w-12 rounded-t-xl transition"
              style={{
                height: `${Math.max((Math.abs(d.value) / max) * 100, 2)}%`,
                backgroundColor: d.value >= 0 ? '#47762a' : '#dc2626',
              }}
              title={`${d.label}: ${fmtMoney(d.value)}`}
            />
          </div>
          <span className="mt-1.5 text-center text-xs font-medium text-stone-500">{d.label}</span>
        </div>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const dispatch = useDispatch()
  const { rows, loading, error } = useSelector((state) => state.dashboard)
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState('')

  useEffect(() => {
    dispatch(fetchDashboard())
  }, [dispatch])

  const handleExport = async () => {
    setExporting(true)
    setExportError('')
    try {
      await Promise.all([
        dispatch(fetchCustomers({ force: true, silent: true })),
        dispatch(fetchTransactions({ force: true, silent: true })),
        dispatch(fetchSales({ force: true, silent: true })),
        dispatch(fetchDashboard({ force: true, silent: true })),
      ]).catch(() => {})
      const st = store.getState()
      await exportToExcel({
        customers: st.customers.items,
        transactions: st.transactions.items,
        sales: st.sales.items,
        dashboard: st.dashboard.rows,
      })
    } catch (err) {
      setExportError('Excel dosyası oluşturulamadı')
    } finally {
      setExporting(false)
    }
  }

  // Yalnızca ham veri değiştiğinde yeniden hesaplanır (her render'da değil)
  const { totalProfit, totalStock, totalEmanet, stats, chartData } = useMemo(() => {
    const totalProfit = rows.reduce((sum, r) => sum + r.profit_loss, 0)
    const totalStock = rows.reduce((sum, r) => sum + r.physical_stock, 0)
    const totalEmanet = rows.reduce((sum, r) => sum + r.emanet_balance, 0)

    const stats = [
      {
        label: 'Toplam Kâr/Zarar',
        value: fmtMoney(totalProfit),
        sub: totalProfit < 0 ? 'Zararda' : 'Kârda',
        icon: totalProfit >= 0 ? TrendingUp : TrendingDown,
        cls: totalProfit >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600',
      },
      {
        label: 'Fiziksel Stok',
        value: `${fmt(totalStock)} ton`,
        sub: 'Depoda kalan ürün',
        icon: Warehouse,
        cls: 'bg-amber-100 text-amber-700',
      },
      {
        label: 'Müşteri Emaneti',
        value: `${fmt(totalEmanet)} ton`,
        sub: 'Emanette bekleyen',
        icon: Package,
        cls: 'bg-farm-100 text-green-700',
      },
    ]

    const chartData = rows.map((r) => ({ label: r.product_name, value: r.profit_loss }))

    return { totalProfit, totalStock, totalEmanet, stats, chartData }
  }, [rows])

  return (
    <div>
      <PageHeader
        icon={BarChart3}
        title="Kâr / Zarar Özeti"
        subtitle="Ürün bazlı anlık stok ve finansal durum"
        right={
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-2 rounded-xl bg-green-700 px-4 py-2.5 text-sm font-semibold text-white shadow-soft transition hover:bg-green-800 disabled:opacity-60"
            title="Tüm verileri formüllerle Excel'e aktar"
          >
            {exporting ? <Loader2 className="animate-spin" size={16} /> : <FileSpreadsheet size={16} />}
            Excel Olarak İndir
          </button>
        }
      />

      {exportError && <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{exportError}</p>}

      {error && (
        <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="card p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-stone-500">{s.label}</p>
                <p className={`mt-1 text-2xl font-bold ${totalProfit >= 0 && s.label === 'Toplam Kâr/Zarar' ? 'text-green-700' : 'text-stone-800'}`}>
                  {s.value}
                </p>
                <p className="mt-0.5 text-xs text-stone-400">{s.sub}</p>
              </div>
              <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${s.cls}`}>
                <s.icon size={22} />
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="card mb-6 p-4">
        <h2 className="mb-3 text-lg font-semibold text-stone-800">Ürün Bazlı Kâr/Zarar (₺)</h2>
        {loading ? (
          <div className="flex h-56 items-center justify-center">
            <Loader2 className="animate-spin text-green-700" />
          </div>
        ) : (
          <BarChart data={chartData} />
        )}
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-b border-stone-100 bg-stone-50">
              <th className="th">Ürün</th>
              <th className="th">Alınan (ton)</th>
              <th className="th">Alış Maliyeti (₺)</th>
              <th className="th">Ort. Alış (₺/kg)</th>
              <th className="th">Satılan (ton)</th>
              <th className="th">Ort. Satış (₺/kg)</th>
              <th className="th">Emanet (ton)</th>
              <th className="th">Güncel Stok (ton)</th>
              <th className="th">Kâr/Zarar (₺)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.product_name} className="border-b border-stone-50 hover:bg-farm-50/50">
                <td className="td">
                  <ProductBadge product={r.product_name} />
                </td>
                <td className="td">{fmt(r.total_purchased_quantity)}</td>
                <td className="td">{fmt(r.total_purchased_amount, 2)}</td>
                <td className="td">{fmt(r.avg_buy_price, 2)}</td>
                <td className="td">{fmt(r.sold_quantity)}</td>
                <td className="td">{fmt(r.avg_sell_price, 2)}</td>
                <td className="td">{fmt(r.emanet_balance)}</td>
                <td className={`td font-semibold ${r.physical_stock < 0 ? 'text-red-600' : ''}`}>{fmt(r.physical_stock)}</td>
                <td className={`td font-semibold ${r.profit_loss >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                  {fmt(r.profit_loss, 2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && rows.length === 0 && <p className="p-4 text-stone-500">Henüz kayıt yok.</p>}
      </div>
    </div>
  )
}