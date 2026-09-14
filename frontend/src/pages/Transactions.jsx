import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { ArrowLeftRight, Pencil, Save, Search, Trash2 } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import ProductBadge from '../components/ProductBadge'
import TireLoader from '../components/ui/TireLoader'
import ConfirmDialog from '../components/ConfirmDialog'
import { fetchCustomers } from '../store/slices/customersSlice'
import { addTransaction, deleteTransaction, fetchTransactions, updateTransaction } from '../store/slices/transactionsSlice'
import { PRODUCTS, TRANSACTION_TYPES } from '../api/constants'
import { getHarvestYearOptions, getHarvestYearFilterOptions } from '../utils/getHarvestYearOptions'

const typeCls = {
  Emanet: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
  'Emanetten Alış': 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
  'Normal Alış': 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
}

const HARVEST_YEAR_OPTIONS = getHarvestYearOptions()
const FILTER_YEAR_OPTIONS = getHarvestYearFilterOptions()
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
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [editForm, setEditForm] = useState(null)
  const [updating, setUpdating] = useState(false)
  const [updateError, setUpdateError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedYear, setSelectedYear] = useState('all')
  const [selectedProduct, setSelectedProduct] = useState('Tümü')

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
      const matchesProduct =
        selectedProduct === 'Tümü' || t.product_name === selectedProduct
      return matchesName && matchesYear && matchesProduct
    })
  }, [transactions, searchQuery, selectedYear, selectedProduct])

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

  const toDateInputValue = (d) => {
    if (!d) return ''
    const dt = new Date(d)
    if (Number.isNaN(dt.getTime())) return ''
    const m = String(dt.getMonth() + 1).padStart(2, '0')
    const day = String(dt.getDate()).padStart(2, '0')
    return `${dt.getFullYear()}-${m}-${day}`
  }

  const openEditModal = (item) => {
    setUpdateError('')
    setEditForm({
      customer_id: item.customer_id ?? '',
      type: item.type,
      product_name: item.product_name,
      quantity: item.quantity,
      price: item.price,
      date: toDateInputValue(item.date),
      harvest_year: item.harvest_year ?? '',
    })
    setEditingItem(item)
    setIsEditModalOpen(true)
  }

  const onEditChange = (e) => setEditForm({ ...editForm, [e.target.name]: e.target.value })

  const handleUpdate = async (e) => {
    e.preventDefault()
    if (!editingItem || !editForm) return
    setUpdating(true)
    setUpdateError('')
    try {
      await dispatch(updateTransaction({ id: editingItem.id, data: editForm })).unwrap()
      setIsEditModalOpen(false)
      setEditingItem(null)
      setEditForm(null)
    } catch (err) {
      setUpdateError(err.response?.data?.detail || 'İşlem güncellenemedi')
    } finally {
      setUpdating(false)
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
            {HARVEST_YEAR_OPTIONS.map((o) => (
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
            className="input-field disabled:bg-stone-100 dark:disabled:bg-stone-700"
          />
          {form.type === 'Emanet' && <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400">Emanette fiyat otomatik 0</p>}
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
        {formError && <p className="text-sm text-red-600 dark:text-red-400 sm:col-span-2 lg:col-span-3">{formError}</p>}
      </form>

      {error && <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/40 dark:text-red-400">{error}</p>}
      {deleteError && <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/40 dark:text-red-400">{deleteError}</p>}

      <div className="card mb-4 flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 dark:text-stone-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Müşteri adına göre ara..."
            className="input-field pl-9"
            aria-label="Müşteri ara"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2 shadow-sm dark:border-stone-700 dark:bg-stone-800">
            <span className="text-xs font-semibold uppercase tracking-wide text-stone-400 dark:text-stone-500">Hasat Yılı</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="cursor-pointer bg-transparent text-sm font-semibold text-stone-700 outline-none dark:text-stone-200"
              aria-label="Hasat yılı seçimi"
            >
              {FILTER_YEAR_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2 shadow-sm dark:border-stone-700 dark:bg-stone-800">
            <span className="text-xs font-semibold uppercase tracking-wide text-stone-400 dark:text-stone-500">Ürün</span>
            <select
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              className="cursor-pointer bg-transparent text-sm font-semibold text-stone-700 outline-none dark:text-stone-200"
              aria-label="Ürün tipi seçimi"
            >
              <option value="Tümü">Tümü</option>
              {PRODUCTS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
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
                  <tr className="border-b border-stone-100 bg-stone-50 dark:border-stone-800 dark:bg-stone-800/50">
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
                    <tr key={t.id} className="border-b border-stone-50 hover:bg-farm-50/50 dark:border-stone-800 dark:hover:bg-stone-800/50">
                      <td className="td">{new Date(t.date).toLocaleDateString('tr-TR')}</td>
                      <td className="td font-semibold text-stone-800 dark:text-stone-100">{t.customer_name}</td>
                      <td className="td">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${typeCls[t.type] || 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400'}`}>
                          {t.type}
                        </span>
                      </td>
                      <td className="td">
                        <ProductBadge product={t.product_name} />
                      </td>
                      <td className="td font-medium text-stone-600 dark:text-stone-400">{t.harvest_year || '-'}</td>
                      <td className="td">{t.quantity.toLocaleString('tr-TR')}</td>
                      <td className="td">{t.price.toLocaleString('tr-TR')}</td>
                      <td className="td font-medium">{(t.quantity * t.price).toLocaleString('tr-TR', { maximumFractionDigits: 2 })}</td>
                      <td className="td">
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => openEditModal(t)}
                            className="rounded-lg p-2 text-blue-500 transition hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-900/40 dark:hover:text-blue-400"
                            title="İşlemi düzenle"
                          >
                            <Pencil size={18} />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDeleteError('')
                              setDeleteId(t.id)
                            }}
                            className="rounded-lg p-2 text-red-400 transition hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-900/40 dark:hover:text-red-400"
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
                <div key={t.id} className="rounded-2xl border border-stone-100 bg-white p-4 shadow-soft dark:border-stone-800 dark:bg-stone-900">
                  <div className="mb-3 flex items-center justify-between gap-3 border-b border-stone-100 pb-3 dark:border-stone-800">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className={`inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${typeCls[t.type] || 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400'}`}>
                        {t.type}
                      </span>
                      <span className="truncate text-base font-semibold text-stone-800 dark:text-stone-100">{t.customer_name}</span>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEditModal(t)}
                        className="shrink-0 rounded-lg p-2 text-blue-500 transition hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-900/40 dark:hover:text-blue-400"
                        title="İşlemi düzenle"
                      >
                        <Pencil size={18} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDeleteError('')
                          setDeleteId(t.id)
                        }}
                        className="shrink-0 rounded-lg p-2 text-red-400 transition hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-900/40 dark:hover:text-red-400"
                        title="İşlemi sil"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center justify-between py-2 border-b border-stone-50 dark:border-stone-800">
                      <span className="text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500">Tarih</span>
                      <span className="whitespace-nowrap text-sm font-medium text-stone-800 dark:text-stone-100 text-right">{new Date(t.date).toLocaleDateString('tr-TR')}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-stone-50 dark:border-stone-800">
                      <span className="text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500">Hasat Yılı</span>
                      <span className="whitespace-nowrap text-sm font-medium text-stone-800 dark:text-stone-100 text-right">{t.harvest_year || '-'}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-stone-50 dark:border-stone-800">
                      <span className="text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500">Ürün</span>
                      <span className="flex items-center gap-2 text-sm font-medium text-stone-800 dark:text-stone-100 text-right"><ProductBadge product={t.product_name} /></span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-stone-50 dark:border-stone-800">
                      <span className="text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500">Miktar</span>
                      <span className="whitespace-nowrap text-sm font-medium text-stone-800 dark:text-stone-100 text-right">{t.quantity.toLocaleString('tr-TR')} ton</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-stone-50 dark:border-stone-800">
                      <span className="text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500">Fiyat</span>
                      <span className="whitespace-nowrap text-sm font-medium text-stone-800 dark:text-stone-100 text-right">{t.price.toLocaleString('tr-TR')} ₺/kg</span>
                    </div>
                    <div className="flex items-center justify-between py-2 last:border-0">
                      <span className="text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500">Tutar</span>
                      <span className="whitespace-nowrap text-base font-bold text-stone-800 dark:text-stone-100 text-right">{(t.quantity * t.price).toLocaleString('tr-TR', { maximumFractionDigits: 2 })} ₺</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
        {!loading && transactions.length === 0 && <p className="p-4 text-stone-500 dark:text-stone-400">Henüz işlem eklenmemiş.</p>}
        {!loading && transactions.length > 0 && filteredTransactions.length === 0 && (
          <div className="flex items-center justify-center gap-2 px-4 py-10 text-stone-500 dark:text-stone-400">
            <Search size={18} />
            <p className="text-sm">Bu kriterlere uygun işlem bulunamadı.</p>
          </div>
        )}
      </div>

      {isEditModalOpen && editForm && editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => {
              if (!updating) setIsEditModalOpen(false)
            }}
          />
          <form onSubmit={handleUpdate} className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-stone-900">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/40">
                <Pencil className="text-blue-600 dark:text-blue-400" size={18} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-stone-800 dark:text-stone-100">İşlemi Düzenle</h3>
                <p className="text-sm text-stone-500 dark:text-stone-400">İşlem kaydını güncelleyin ve değişiklikleri kaydedin.</p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="label">Müşteri</label>
                <select name="customer_id" value={editForm.customer_id} onChange={onEditChange} required className="input-field">
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
                <select name="type" value={editForm.type} onChange={onEditChange} className="input-field">
                  {TRANSACTION_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Ürün</label>
                <select name="product_name" value={editForm.product_name} onChange={onEditChange} className="input-field">
                  {PRODUCTS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Hasat Yılı</label>
                <select name="harvest_year" value={editForm.harvest_year} onChange={onEditChange} className="input-field">
                  {HARVEST_YEAR_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Miktar (ton)</label>
                <input type="number" step="any" min="0" name="quantity" value={editForm.quantity} onChange={onEditChange} required className="input-field" />
              </div>
              <div>
                <label className="label">Fiyat (₺/kg)</label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  name="price"
                  value={editForm.price}
                  onChange={onEditChange}
                  disabled={editForm.type === 'Emanet'}
                  className="input-field disabled:bg-stone-100 dark:disabled:bg-stone-700"
                />
                {editForm.type === 'Emanet' && <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400">Emanette fiyat otomatik 0</p>}
              </div>
              <div>
                <label className="label">Tarih</label>
                <input type="date" name="date" value={editForm.date} onChange={onEditChange} className="input-field" />
              </div>
            </div>

            {updateError && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/40 dark:text-red-400">{updateError}</p>}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  if (!updating) setIsEditModalOpen(false)
                }}
                disabled={updating}
                className="rounded-xl border border-stone-200 px-4 py-2.5 text-sm font-semibold text-stone-600 transition hover:bg-stone-50 disabled:opacity-60 dark:border-stone-700 dark:text-stone-400 dark:hover:bg-stone-800"
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={updating}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-green-800 disabled:opacity-60 dark:bg-green-600 dark:hover:bg-green-500"
              >
                {updating && <TireLoader className="h-4 w-4" />}
                Değişiklikleri Kaydet
              </button>
            </div>
          </form>
        </div>
      )}

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