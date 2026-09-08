import { useMemo } from 'react'
import { CalendarRange, Package, Warehouse, X } from 'lucide-react'
import ProductBadge from './ProductBadge'

const safeNum = (n) => (Number.isFinite(Number(n)) ? Number(n) : 0)
const fmt = (n, max = 3) => safeNum(n).toLocaleString('tr-TR', { maximumFractionDigits: max })

const MODE_CONFIG = {
  stock: {
    title: 'Stok Detayı',
    icon: Warehouse,
    metric: 'physical_stock',
    emptyMsg: 'Seçili yıl için stok hareketi bulunmuyor.',
    totalLabel: 'Toplam Net Stok',
    unit: 'ton',
  },
  emanet: {
    title: 'Müşteri Emaneti',
    icon: Package,
    metric: 'emanet_balance',
    emptyMsg: 'Seçili yıl için emanet kaydı bulunmuyor.',
    totalLabel: 'Toplam Emanet',
    unit: 'ton',
  },
}

export default function BreakdownModal({ mode, rows, yearLabel, onClose }) {
  const config = MODE_CONFIG[mode] || MODE_CONFIG.stock
  const Icon = config.icon

  const items = useMemo(() => {
    const metric = config.metric
    const filtered = metric === 'emanet_balance'
      ? rows.filter((r) => safeNum(r[metric]) !== 0)
      : rows
    const max = Math.max(
      ...rows.map((r) => Math.abs(safeNum(r[metric]))),
      1
    )
    return filtered
      .map((r) => {
        const value = safeNum(r[metric])
        return {
          product: r.product_name,
          value,
          pct: Math.max((Math.abs(value) / max) * 100, value !== 0 ? 4 : 0),
        }
      })
      .sort((a, b) => b.value - a.value)
  }, [rows, config.metric])

  const total = useMemo(() => items.reduce((s, i) => s + safeNum(i.value), 0), [items])
  const hasAny = items.some((i) => i.value !== 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-stone-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-stone-100 bg-green-700 px-5 py-4">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-white">
              <Icon size={20} />
              {config.title}
            </h2>
            <p className="mt-0.5 flex items-center gap-1.5 text-sm text-white/70">
              <CalendarRange size={14} />
              Seçili Yıl: {yearLabel}
            </p>
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
          {!hasAny ? (
            <div className="flex flex-col items-center gap-2 py-10 text-stone-400">
              <Package size={28} />
              <p className="text-sm">{config.emptyMsg}</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-xl bg-stone-50 px-4 py-3">
                <span className="text-sm font-semibold text-stone-600">{config.totalLabel}</span>
                <span className="text-lg font-bold text-stone-800">{fmt(total)} {config.unit}</span>
              </div>

              {items.map((i) => (
                <div key={i.product}>
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <ProductBadge product={i.product} showName={false} size={13} />
                      <span className="truncate text-sm font-medium text-stone-700">{i.product}</span>
                    </div>
                    <span className="text-sm font-bold text-stone-800">
                      {fmt(i.value)} {config.unit}
                    </span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-stone-100">
                    <div
                      className={`h-full rounded-full transition-all ${
                        i.value < 0 ? 'bg-red-500' : 'bg-green-600'
                      }`}
                      style={{ width: `${Math.min(i.pct, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}