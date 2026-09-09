import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { BarChart3, Banknote, ChevronRight, FileSpreadsheet, Package, TrendingDown, TrendingUp, Warehouse } from 'lucide-react'
import TireLoader from '../components/ui/TireLoader'
import PageHeader from '../components/PageHeader'
import ProductBadge from '../components/ProductBadge'
import BreakdownModal from '../components/BreakdownModal'
import { fetchCustomers } from '../store/slices/customersSlice'
import { fetchTransactions } from '../store/slices/transactionsSlice'
import { fetchSales } from '../store/slices/salesSlice'
import { fetchDashboard } from '../store/slices/dashboardSlice'
import { store } from '../store/store'
import { exportToExcel } from '../utils/exportExcel'
import { getSeasonYearOptions } from '../utils/getSeasonYearOptions'

const safeNum = (n) => (Number.isFinite(Number(n)) ? Number(n) : 0)
const fmt = (n, max = 3) => safeNum(n).toLocaleString('tr-TR', { maximumFractionDigits: max })
const fmtMoney = (n) => `${safeNum(n).toLocaleString('tr-TR', { maximumFractionDigits: 2 })} ₺`
const fmtCompact = (n) => {
  const v = safeNum(n)
  const abs = Math.abs(v)
  if (abs >= 1000000) return `${(v / 1000000).toLocaleString('tr-TR', { maximumFractionDigits: 2 })} M ₺`
  if (abs >= 1000) return `${(v / 1000).toLocaleString('tr-TR', { maximumFractionDigits: 1 })} bin ₺`
  return `${v.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ₺`
}

const PRODUCTS = ['Arpa', 'Buğday', 'Mısır', 'Yağlık Ayçekirdeği', 'Çerezlik Çekirdek']
const TYPE_NORMAL = 'Normal Alış'
const TYPE_EMANET = 'Emanet'
const TYPE_EMANETTEN_ALIS = 'Emanetten Alış'

const YEAR_OPTIONS = getSeasonYearOptions()

// Tarımsal sezon kontrolü: Tarih 1 Temmuz startDate - 30 Haziran (startDate+1) aralığında mı?
function isInSeason(dateStr, startDate) {
  const d = new Date(dateStr)
  const seasonStart = new Date(startDate, 6, 1)
  const seasonEnd = new Date(startDate + 1, 5, 30, 23, 59, 59)
  return d >= seasonStart && d <= seasonEnd
}

// Tavan tarih kontrolü: Tarih sezon sonundan önce veya o gün mü?
function isBeforeOrAtSeasonEnd(dateStr, startDate) {
  const d = new Date(dateStr)
  const seasonEnd = new Date(startDate + 1, 5, 30, 23, 59, 59)
  return d <= seasonEnd
}

// Tarımsal sezon mantığına göre ürün bazlı hesaplama.
// Kümülatif (Stok, Emanet, Alınan, Maliyet): zamanın başlangıcından sezon sonuna kadar
// Satış, Kâr/Zarar, Ciro: Sadece seçilen sezon (Temmuz-Haziran)
function computeYearRows(transactions, sales, year) {
  const isAll = year === 'all'
  const targetYear = !isAll ? parseInt(year, 10) : null

  // ── Kümülatif: sezon sonuna kadar olan işlemler (ceiling date) ───────
  const txnAgg = {}
  for (const t of transactions) {
    if (!isAll && !isBeforeOrAtSeasonEnd(t.date, targetYear)) continue
    const key = `${t.product_name}||${t.type}`
    const qty = safeNum(t.quantity)
    const amount = qty * safeNum(t.price)
    const cur = txnAgg[key] || { qty: 0, amount: 0 }
    cur.qty += qty
    cur.amount += amount
    txnAgg[key] = cur
  }

  // ── Sezon-filtreli: Satışlar (kâr/zarar + ciro için) ──────────────
  const sls = isAll
    ? sales
    : sales.filter((s) => isInSeason(s.date, targetYear))

  const saleAgg = {}
  for (const s of sls) {
    const qty = safeNum(s.quantity)
    const amount = qty * safeNum(s.price)
    const cur = saleAgg[s.product_name] || { qty: 0, amount: 0 }
    cur.qty += qty
    cur.amount += amount
    saleAgg[s.product_name] = cur
  }

  const get = (p, type) => txnAgg[`${p}||${type}`] || { qty: 0, amount: 0 }

  return PRODUCTS.map((product) => {
    const boughtN = get(product, TYPE_NORMAL)
    const boughtE = get(product, TYPE_EMANETTEN_ALIS)
    const bought_quantity = safeNum(boughtN.qty) + safeNum(boughtE.qty)
    const bought_amount = safeNum(boughtN.amount) + safeNum(boughtE.amount)

    const emanet_qty = safeNum(get(product, TYPE_EMANET).qty)
    const emanet_balance = emanet_qty - safeNum(boughtE.qty)

    const sold = saleAgg[product] || { qty: 0, amount: 0 }

    // Fiziksel Stok = Normal Alış + Emanet - Satışlar (ceiling date'e kadar)
    const physical_stock = (safeNum(boughtN.qty) + emanet_qty) - safeNum(sold.qty)

    const avg_buy = bought_quantity ? bought_amount / bought_quantity : 0
    const avg_sell = safeNum(sold.qty) ? safeNum(sold.amount) / safeNum(sold.qty) : 0
    const profit_loss = safeNum(sold.amount) - safeNum(sold.qty) * avg_buy

    return {
      product_name: product,
      total_purchased_quantity: bought_quantity,
      total_purchased_amount: bought_amount,
      emanet_balance,
      bought_emanet: safeNum(boughtE.qty),
      physical_stock,
      sold_quantity: safeNum(sold.qty),
      sold_amount: safeNum(sold.amount),
      avg_buy_price: avg_buy,
      avg_sell_price: avg_sell,
      profit_loss,
    }
  })
}

// Her tarımsal sezon için toplam kâr/zararı hesaplar; sezon başlangıç yılları artan sırada.
function computeYearlyProfit(transactions, sales) {
  const years = new Set()
  for (const t of transactions) years.add(new Date(t.date).getFullYear())
  for (const s of sales) years.add(new Date(s.date).getFullYear())
  if (years.size === 0) return []

  const sortedYears = [...years].sort((a, b) => a - b)
  const minYear = sortedYears[0]
  const maxYear = sortedYears[sortedYears.length - 1]

  const seasons = []
  for (let y = minYear; y <= maxYear; y++) {
    seasons.push(y)
  }

  return seasons.map((year) => {
    const rows = computeYearRows(transactions, sales, year)
    return {
      label: `${year}-${year + 1}`,
      value: rows.reduce((sum, r) => sum + safeNum(r.profit_loss), 0),
    }
  })
}

function BarChart({ data }) {
  const max = useMemo(() => Math.max(...data.map((d) => Math.abs(safeNum(d.value))), 1), [data])
  const hasValue = data.some((d) => safeNum(d.value) !== 0)
  if (!hasValue) {
    return (
      <div className="flex h-80 w-full items-center justify-center text-sm text-stone-400">
        Satış bulunmadığı için kâr/zarar 0 ₺ — satış girildiğinde barlar çizilir.
      </div>
    )
  }
  return (
    <div className="flex h-80 w-full items-end gap-3 px-2">
      {data.map((d) => {
        const v = safeNum(d.value)
        return (
          <div key={d.label} className="flex h-full flex-1 flex-col items-center">
            <div className="flex w-full flex-1 items-end justify-center">
              <div
                className="w-full max-w-12 rounded-t-xl transition"
                style={{
                  height: `${Math.max((Math.abs(v) / max) * 100, v === 0 ? 0 : 2)}%`,
                  backgroundColor: v >= 0 ? '#47762a' : '#dc2626',
                }}
                title={`${d.label}: ${fmtMoney(v)}`}
              />
            </div>
            <span className="mt-1.5 text-center text-xs font-medium text-stone-500">{d.label}</span>
          </div>
        )
      })}
    </div>
  )
}

function YearLineChart({ data }) {
  const values = data.map((d) => safeNum(d.value))
  const hasValue = values.some((v) => v !== 0)
  if (!hasValue) {
    return (
      <div className="flex h-80 w-full items-center justify-center text-sm text-stone-400">
        Yıl bazlı kâr/zarar verisi bulunamadı — satış girildiğinde eğilim çizilir.
      </div>
    )
  }

  const W = 600
  const H = 250
  const PAD_X = 26
  const PAD_TOP = 30
  const PAD_BOT = 34
  const innerW = W - PAD_X * 2
  const innerH = H - PAD_TOP - PAD_BOT

  const max = Math.max(...values.map((v) => Math.abs(v)), 1)
  const n = values.length
  const yFor = (v) => PAD_TOP + ((max - v) / (2 * max)) * innerH

  const coords = data.map((d, i) => {
    const x = n === 1 ? W / 2 : PAD_X + (i * innerW) / (n - 1)
    const v = safeNum(d.value)
    return { label: d.label, v, x, y: yFor(v) }
  })

  const zeroY = yFor(0)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Yıllara göre kâr/zarar karşılaştırması">
      {[max / 2, 0, -max / 2].map((gv) =>
        gv === 0 ? (
          <line key={gv} x1={PAD_X} x2={W - PAD_X} y1={zeroY} y2={zeroY} stroke="#d6d3d1" strokeWidth="1" strokeDasharray="4 4" />
        ) : (
          <g key={gv}>
            <line x1={PAD_X} x2={W - PAD_X} y1={yFor(gv)} y2={yFor(gv)} stroke="#e7e5e4" strokeWidth="1" />
            <text x={W - PAD_X - 2} y={yFor(gv) - 4} textAnchor="end" fontSize="10" fill="#a8a29e">
              {fmtCompact(gv)}
            </text>
          </g>
        )
      )}
      <polyline
        points={coords.map((c) => `${c.x},${c.y}`).join(' ')}
        fill="none"
        stroke="#47762a"
        strokeWidth="3"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {coords.map((c) => (
        <g key={c.label}>
          <title>{`${c.label}: ${fmtMoney(c.v)}`}</title>
          <circle cx={c.x} cy={c.y} r="6" fill={c.v >= 0 ? '#15803d' : '#dc2626'} stroke="#fff" strokeWidth="2" />
          <text x={c.x} y={c.y - 10} textAnchor="middle" fontSize="11" fontWeight="700" fill={c.v >= 0 ? '#166534' : '#dc2626'}>
            {fmtCompact(c.v)}
          </text>
          <text x={c.x} y={H - PAD_BOT + 20} textAnchor="middle" fontSize="12" fontWeight="600" fill="#57534e">
            {c.label}
          </text>
        </g>
      ))}
    </svg>
  )
}

export default function Dashboard() {
  const dispatch = useDispatch()
  const dashboard = useSelector((state) => state.dashboard)
  const transactions = useSelector((state) => state.transactions.items)
  const sales = useSelector((state) => state.sales.items)
  const transactionsLoading = useSelector((state) => state.transactions.loading)
  const salesLoading = useSelector((state) => state.sales.loading)
  const [selectedYear, setSelectedYear] = useState('all')
  const [stockModalOpen, setStockModalOpen] = useState(false)
  const [emanetModalOpen, setEmanetModalOpen] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState('')

  useEffect(() => {
    dispatch(fetchDashboard())
    dispatch(fetchTransactions())
    dispatch(fetchSales())
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

  // Hesaplamalar seçili yıla bağlı: "Tümü" seçilince tüm veriler üzerinden çalışır.
  const yearRows = useMemo(
    () => computeYearRows(transactions, sales, selectedYear),
    [transactions, sales, selectedYear]
  )

  const yearlyData = useMemo(
    () => computeYearlyProfit(transactions, sales),
    [transactions, sales]
  )

  const { totalProfit, totalStock, totalEmanet, totalCiro, stats, chartData } = useMemo(() => {
    const totalProfit = yearRows.reduce((sum, r) => sum + safeNum(r.profit_loss), 0)
    const totalStock = yearRows.reduce((sum, r) => sum + safeNum(r.physical_stock), 0)
    const totalEmanet = yearRows.reduce((sum, r) => sum + safeNum(r.emanet_balance), 0)
    const totalCiro = yearRows.reduce((sum, r) => sum + safeNum(r.sold_amount), 0)

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
        clickable: true,
        modal: 'stock',
      },
      {
        label: 'Müşteri Emaneti',
        value: `${fmt(totalEmanet)} ton`,
        sub: 'Emanette bekleyen',
        icon: Package,
        cls: 'bg-farm-100 text-green-700',
        clickable: true,
        modal: 'emanet',
      },
      {
        label: 'Toplam Ciro',
        value: fmtMoney(totalCiro),
        sub: 'Satışlardan elde edilen gelir',
        icon: Banknote,
        cls: 'bg-sky-100 text-sky-700',
      },
    ]

    const chartData = yearRows.map((r) => ({ label: r.product_name, value: safeNum(r.profit_loss) }))

    return { totalProfit, totalStock, totalEmanet, totalCiro, stats, chartData }
  }, [yearRows])

  const loading = dashboard.loading || transactionsLoading || salesLoading
  const error = dashboard.error

  const yearLabel = YEAR_OPTIONS.find((o) => o.value === selectedYear)?.label || 'Tümü'

  return (
    <div>
      <PageHeader
        icon={BarChart3}
        title="Kâr / Zarar Özeti"
        subtitle="Ürün bazlı anlık stok ve finansal durum"
        right={
          <>
            <div className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wide text-stone-400">Sezon</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="cursor-pointer bg-transparent text-sm font-semibold text-stone-700 outline-none"
                aria-label="Yıl seçimi"
              >
                {YEAR_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="flex items-center gap-2 rounded-xl bg-green-700 px-4 py-2.5 text-sm font-semibold text-white shadow-soft transition hover:bg-green-800 disabled:opacity-60"
              title="Tüm verileri formüllerle Excel'e aktar"
            >
              {exporting ? <TireLoader className="h-4 w-4" /> : <FileSpreadsheet size={16} />}
              Excel Olarak İndir
            </button>
          </>
        }
      />

      {exportError && <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{exportError}</p>}

      {error && (
        <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.label}
            onClick={
              s.modal === 'stock'
                ? () => setStockModalOpen(true)
                : s.modal === 'emanet'
                  ? () => setEmanetModalOpen(true)
                  : undefined
            }
            className={
              s.clickable
                ? 'card group cursor-pointer p-5 transition-all duration-300 hover:-translate-y-1 hover:bg-farm-50 hover:shadow-xl hover:ring-2 hover:ring-green-300'
                : 'card p-5'
            }
            title={s.clickable ? 'Detayları görüntülemek için tıklayın' : undefined}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-stone-500 group-hover:text-green-800">{s.label}</p>
                <p className={`mt-1 text-2xl font-bold ${totalProfit >= 0 && s.label === 'Toplam Kâr/Zarar' ? 'text-green-700' : 'text-stone-800'}`}>
                  {s.value}
                </p>
                <p className="mt-0.5 flex items-center gap-1 text-xs text-stone-400">
                  {s.sub}
                  {s.clickable && (
                    <span className="inline-flex items-center gap-0.5 font-semibold text-green-700 opacity-60 transition group-hover:translate-x-0.5 group-hover:opacity-100">
                      Detay göster <ChevronRight size={12} />
                    </span>
                  )}
                </p>
              </div>
              <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${s.cls} transition group-hover:scale-110`}>
                <s.icon size={22} />
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card p-4">
          <h2 className="mb-3 text-lg font-semibold text-stone-800">Ürün Bazlı Kâr/Zarar (₺)</h2>
          {loading ? (
            <div className="flex h-80 w-full items-center justify-center">
              <TireLoader className="h-[26px] w-[26px]" />
            </div>
          ) : (
            <BarChart data={chartData} />
          )}
        </div>
        <div className="card p-4">
          <h2 className="mb-3 text-lg font-semibold text-stone-800">Yıllara Göre Kâr/Zarar Karşılaştırması (₺)</h2>
          {loading ? (
            <div className="flex h-80 w-full items-center justify-center">
              <TireLoader className="h-[26px] w-[26px]" />
            </div>
          ) : (
            <YearLineChart data={yearlyData} />
          )}
        </div>
      </div>

      <div className="card">
        <div className="hidden overflow-x-auto md:block">
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
            {yearRows.map((r) => (
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
        </div>

        <div className="flex flex-col gap-3 p-3 sm:p-4 md:hidden">
          {yearRows.map((r) => (
            <div key={r.product_name} className="rounded-2xl border border-stone-100 bg-white p-4 shadow-soft">
              <div className="mb-3 flex items-center justify-between gap-3 border-b border-stone-100 pb-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <ProductBadge product={r.product_name} showName={false} size={18} />
                  <span className="truncate text-base font-semibold text-stone-800">{r.product_name}</span>
                </div>
                <span
                  className={`shrink-0 rounded-lg px-2.5 py-1 text-sm font-bold ${
                    r.profit_loss >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                  }`}
                >
                  {fmt(r.profit_loss, 2)} ₺
                </span>
              </div>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-stone-400">Alınan (ton)</dt>
                  <dd className="text-sm font-medium text-stone-700">{fmt(r.total_purchased_quantity)}</dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-stone-400">Alış Maliyeti (₺)</dt>
                  <dd className="text-sm font-medium text-stone-700">{fmt(r.total_purchased_amount, 2)}</dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-stone-400">Satılan (ton)</dt>
                  <dd className="text-sm font-medium text-stone-700">{fmt(r.sold_quantity)}</dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-stone-400">Ort. Satış (₺/kg)</dt>
                  <dd className="text-sm font-medium text-stone-700">{fmt(r.avg_sell_price, 2)}</dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-stone-400">Emanet (ton)</dt>
                  <dd className="text-sm font-medium text-stone-700">{fmt(r.emanet_balance)}</dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-stone-400">Güncel Stok (ton)</dt>
                  <dd className={`text-sm font-semibold ${r.physical_stock < 0 ? 'text-red-600' : 'text-stone-700'}`}>
                    {fmt(r.physical_stock)}
                  </dd>
                </div>
              </dl>
            </div>
          ))}
        </div>
        {!loading && yearRows.length === 0 && <p className="p-4 text-stone-500">Henüz kayıt yok.</p>}
      </div>

      {stockModalOpen && (
        <BreakdownModal
          mode="stock"
          rows={yearRows}
          yearLabel={yearLabel}
          onClose={() => setStockModalOpen(false)}
        />
      )}

      {emanetModalOpen && (
        <BreakdownModal
          mode="emanet"
          rows={yearRows}
          yearLabel={yearLabel}
          onClose={() => setEmanetModalOpen(false)}
        />
      )}
    </div>
  )
}