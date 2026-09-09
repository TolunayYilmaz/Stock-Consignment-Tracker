import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { ArrowLeftRight, Save, Search, Trash2 } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import ProductBadge from '../components/ProductBadge'
import TireLoader from '../components/ui/TireLoader'
import ConfirmDialog from '../components/ConfirmDialog'
import { fetchCustomers } from '../store/slices/customersSlice'
import { addTransaction, deleteTransaction, fetchTransactions } from '../store/slices/transactionsSlice'
import { PRODUCTS, TRANSACTION_TYPES } from '../api/constants'
import { getSeasonYearOptions } from '../utils/getSeasonYearOptions'

const typeCls = {
  Emanet: 'bg-amber-100 text-amber-700',
  'Emanetten Alış': 'bg-blue-100 text-blue-700',
  'Normal Alış': 'bg-green-100 text-green-700',
}

const YEAR_OPTIONS = getSeasonYearOptions()
const DEFAULT_HARVEST_YEAR = new Date().getFullYear()

const emptyForm = {
  customer_id: '',
  type: 'Emanet',
  product_name: PRODUCTS[0],
  quantity: '',
  price: '',
  date: '',
  harvest_year: DEFAULT_HARVEST_YEAR,
}

export default function Transactions() {
  const dispatch = useDispatch()
  const customers = useSelector((state) => state.customers.items)
  const { items: transactions, loading, error } = useSelector((state) => state.transactions)
  const [form, setForm] = useState(emptyForm)
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [deleteId, setDeleteId] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedYear, setSelectedYear] = useState('all')

  useEffect(() => {
    dispatch(fetchCustomers())
    dispatch(fetchTransactions())
  }, [dispatch])

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const onSubmit = async (e) => {
    e.preventDefault()
    setFormError('')
    setSubmitting(true)
    try {
      await dispatch(addTransaction(form)).unwrap()
      setForm({ ...emptyForm, harvest_year: DEFAULT_HARVEST_YEAR })
    } catch (err) {
      setFormError(err.response?.data?.detail || 'İşlem kaydedilemedi')
    } finally {
      setSubmitting(false)
    }
  }

  const totalZarar = useMemo(
    () => transactions.reduce((s, t) => s + t.quantity * t.price, 0),
    [transactions]
  )

  const filteredTransactions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return transactions.filter((t) => {
      const matchesName =
        !q || (t.customer_name || '').toLowerCase().includes(q)
      const matchesYear =
        selectedYear === 'all' || t.harvest_year === parseInt(selectedYear, 10)
      return matchesName && matchesYear
    })
  }, [transactions, searchQuery, selectedYear])

  const handleDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    try {
      await dispatch(deleteTransaction(deleteId)).unwrap()
      setDeleteId(null)
    } catch (err) {
      setDeleteError(err.response?.data?.detail || 'İşlem silinemedi')
      setDeleteId(null)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div>
      <PageHeader icon={ArrowLeftRight} title="Alış ve Emanet İşlemleri" subtitle="Yeni işlem ekle ve geçmişi gör" />

      <form onSubmit={onSubmit} className="card mb-6 grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <label className="label">Müşteri</label>
          <select name="customer_id" value={form.customer_id} onChange={onChange} required className="input-field">
            <option value="">Seçin</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">İşlem Tipi</label>
          <select name="type" value={form.type} onChange={onChange} className="input-field">
            {TRANSACTION_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Ürün</label>
          <select name="product_name" value={form.product_name} onChange={onChange} className="input-field">
            {PRODUCTS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Hasat Yılı</label>
          <select name="harvest_year" value={form.harvest_year} onChange={onChange} className="input-field">
            {YEAR_OPTIONS.filter((o) => o.value !== 'all').map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Miktar (ton)</label>
          <input type="number" step="any" min="0" name="quantity" value={form.quantity} onChange={onChange} required className="input-field" />
        </div>
        <div>
          <label className="label">Fiyat (₺/kg)</label>
          <input
            type="number"
            step="any"
            min="0"
            name="price"
            value={form.price}
            onChange={onChange}
            disabled={form.type === 'Emanet'}
            className="input-field disabled:bg-stone-100"
          />
          {form.type === 'Emanet' && <p className="mt-1 text-[11px] text-amber-600">Emanette fiyat otomatik 0</p>}
        </div>
        <div>
          <label className="label">Tarih</label>
          <input type="date" name="date" value={form.date} onChange={onChange} className="input-field" />
        </div>
        <div className="sm:col-span-2 lg:col-span-3">
          <button type="submit" disabled={submitting} className="btn-primary">
            <Save size={16} />
            İşlemi Kaydet
          </button>
        </div>
        {formError && <p className="text-sm text-red-600 sm:col-span-2 lg:col-span-3">{formError}</p>}
      </form>

      {error && <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {deleteError && <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{deleteError}</p>}

      <div className="card mb-4 flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Müşteri adına göre ara..."
            className="input-field pl-9"
            aria-label="Müşteri ara"
          />
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wide text-stone-400">Hasat Yılı</span>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="cursor-pointer bg-transparent text-sm font-semibold text-stone-700 outline-none"
            aria-label="Hasat yılı seçimi"
          >
            {YEAR_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="card overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center p-10">
            <TireLoader className="h-6 w-6" />
          </div>
        ) : (
          <>
            <div className="hidden md:block">
              <table className="w-full min-w-[940px] text-sm">
                <thead>
                  <tr className="border-b border-stone-100 bg-stone-50">
                    <th className="th">Tarih</th>
                    <th className="th">Müşteri</th>
                    <th className="th">İşlem</th>
                    <th className="th">Ürün</th>
                    <th className="th">Hasat Yılı</th>
                    <th className="th">Miktar (ton)</th>
                    <th className="th">Fiyat (₺/kg)</th>
                    <th className="th">Tutar</th>
                    <th className="th text-right">İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((t) => (
                    <tr key={t.id} className="border-b border-stone-50 hover:bg-farm-50/50">
                      <td className="td">{new Date(t.date).toLocaleDateString('tr-TR')}</td>
                      <td className="td font-semibold text-stone-800">{t.customer_name}</td>
                      <td className="td">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${typeCls[t.type] || 'bg-stone-100 text-stone-600'}`}>
                          {t.type}
                        </span>
                      </td>
                      <td className="td">
                        <ProductBadge product={t.product_name} />
                      </td>
                      <td className="td font-medium text-stone-600">{t.harvest_year || '-'}</td>
                      <td className="td">{t.quantity.toLocaleString('tr-TR')}</td>
                      <td className="td">{t.price.toLocaleString('tr-TR')}</td>
                      <td className="td font-medium">{(t.quantity * t.price).toLocaleString('tr-TR', { maximumFractionDigits: 2 })}</td>
                      <td className="td">
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => {
                              setDeleteError('')
                              setDeleteId(t.id)
                            }}
                            className="rounded-lg p-2 text-red-400 transition hover:bg-red-50 hover:text-red-700"
                            title="İşlemi sil"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-3 p-3 sm:p-4 md:hidden">
              {filteredTransactions.map((t) => (
                <div key={t.id} className="rounded-2xl border border-stone-100 bg-white p-4 shadow-soft">
                  <div className="mb-3 flex items-center justify-between gap-3 border-b border-stone-100 pb-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className={`inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${typeCls[t.type] || 'bg-stone-100 text-stone-600'}`}>
                        {t.type}
                      </span>
                      <span className="truncate text-base font-semibold text-stone-800">{t.customer_name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setDeleteError('')
                        setDeleteId(t.id)
                      }}
                      className="shrink-0 rounded-lg p-2 text-red-400 transition hover:bg-red-50 hover:text-red-700"
                      title="İşlemi sil"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center justify-between py-2 border-b border-stone-50">
                      <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">Tarih</span>
                      <span className="whitespace-nowrap text-sm font-medium text-stone-800 text-right">{new Date(t.date).toLocaleDateString('tr-TR')}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-stone-50">
                      <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">Hasat Yılı</span>
                      <span className="whitespace-nowrap text-sm font-medium text-stone-800 text-right">{t.harvest_year || '-'}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-stone-50">
                      <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">Ürün</span>
                      <span className="flex items-center gap-2 text-sm font-medium text-stone-800 text-right"><ProductBadge product={t.product_name} /></span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-stone-50">
                      <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">Miktar</span>
                      <span className="whitespace-nowrap text-sm font-medium text-stone-800 text-right">{t.quantity.toLocaleString('tr-TR')} ton</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-stone-50">
                      <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">Fiyat</span>
                      <span className="whitespace-nowrap text-sm font-medium text-stone-800 text-right">{t.price.toLocaleString('tr-TR')} ₺/kg</span>
                    </div>
                    <div className="flex items-center justify-between py-2 last:border-0">
                      <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">Tutar</span>
                      <span className="whitespace-nowrap text-base font-bold text-stone-800 text-right">{(t.quantity * t.price).toLocaleString('tr-TR', { maximumFractionDigits: 2 })} ₺</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
        {!loading && transactions.length === 0 && <p className="p-4 text-stone-500">Henüz işlem eklenmemiş.</p>}
        {!loading && transactions.length > 0 && filteredTransactions.length === 0 && (
          <div className="flex items-center justify-center gap-2 px-4 py-10 text-stone-500">
            <Search size={18} />
            <p className="text-sm">Bu kriterlere uygun işlem bulunamadı.</p>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={deleteId !== null}
        title="İşlemi Sil"
        message="Bu işlemi silmek istediğinize emin misiniz?"
        detail={deleteId ? transactions.find((t) => t.id === deleteId)?.customer_name : ''}
        confirming={deleting}
        onCancel={() => {
          setDeleteId(null)
          setDeleting(false)
        }}
        onConfirm={handleDelete}
      />
    </div>
  )
}
