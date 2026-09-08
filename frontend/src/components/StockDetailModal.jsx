import { useMemo } from 'react'
import { CalendarRange, Package, Warehouse, X } from 'lucide-react'
import ProductBadge from './ProductBadge'

const safeNum = (n) => (Number.isFinite(Number(n)) ? Number(n) : 0)

const fmt = (n, max = 3) =>
  safeNum(n).toLocaleString('tr-TR', { maximumFractionDigits: max })

export default function StockDetailModal({ rows, yearLabel, onClose }) {
  const items = useMemo(() => {
    const max = Math.max(...rows.map((r) => Math.abs(safeNum(r.physical_stock))), 1)
    return rows
      .map((r) => ({
        product: r.product_name,
        stock: safeNum(r.physical_stock),
        emanet: safeNum(r.emanet_balance),
        pct: rows.some((x) => safeNum(x.physical_stock) !== 0)
          ? Math.max((Math.abs(safeNum(r.physical_stock)) / max) * 100, safeNum(r.physical_stock) !== 0 ? 4 : 0)
          : 0,
      }))
      .sort((a, b) => b.stock - a.stock)
  }, [rows])

  const total = useMemo(() => items.reduce((s, i) => s + safeNum(i.stock), 0), [items])
  const hasAny = items.some((i) => i.stock !== 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-stone-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-stone-100 bg-green-700 px-5 py-4">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-white">
              <Warehouse size={20} />
              Stok Detayı
            </h2>
            <p className="mt-0.5 flex items-center gap-1.5 text-sm text-white/70">
              <CalendarRange size={14} />
              {yearLabel}
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
              <p className="text-sm">Seçili yıl için stok hareketi bulunmuyor.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-xl bg-stone-50 px-4 py-3">
                <span className="text-sm font-semibold text-stone-600">Toplam Net Stok</span>
                <span className="text-lg font-bold text-stone-800">{fmt(total)} ton</span>
              </div>

              {items.map((i) => (
                <div key={i.product}>
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <ProductBadge product={i.product} showName={false} size={13} />
                      <span className="truncate text-sm font-medium text-stone-700">{i.product}</span>
                    </div>
                    <span className="text-sm font-bold text-stone-800">{fmt(i.stock)} ton</span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-stone-100">
                    <div
                      className={`h-full rounded-full transition-all ${
                        i.stock < 0 ? 'bg-red-500' : 'bg-green-600'
                      }`}
                      style={{ width: `${Math.min(i.pct, 100)}%` }}
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-stone-400">Emanet: {fmt(i.emanet)} ton</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}