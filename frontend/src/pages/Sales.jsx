import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Pencil, Save, Search, ShoppingCart, Trash2 } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import ProductBadge from '../components/ProductBadge'
import TireLoader from '../components/ui/TireLoader'
import ConfirmDialog from '../components/ConfirmDialog'
import { fetchCustomers } from '../store/slices/customersSlice'
import { addSale, deleteSale, fetchSales, updateSale } from '../store/slices/salesSlice'
import { PRODUCTS } from '../api/constants'
import { getHarvestYearOptions, getHarvestYearFilterOptions } from '../utils/getHarvestYearOptions'

const HARVEST_YEAR_OPTIONS = getHarvestYearOptions()
const FILTER_YEAR_OPTIONS = getHarvestYearFilterOptions()
const DEFAULT_HARVEST_YEAR = new Date().getFullYear()

const emptyForm = {
  customer_name: '',
  product_name: PRODUCTS[0],
  quantity: '',
  price: '',
  date: '',
  harvest_year: DEFAULT_HARVEST_YEAR,
}

export default function Sales() {
  const dispatch = useDispatch()
  const customers = useSelector((state) => state.customers.items)
  const { items: sales, loading, error } = useSelector((state) => state.sales)
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
    dispatch(fetchSales())
  }, [dispatch])

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const onSubmit = async (e) => {
    e.preventDefault()
    setFormError('')
    setSubmitting(true)
    try {
      await dispatch(addSale(form)).unwrap()
      setForm({ ...emptyForm, harvest_year: DEFAULT_HARVEST_YEAR })
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Satış kaydedilemedi')
    } finally {
      setSubmitting(false)
    }
  }

  const filteredSales = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return sales.filter((s) => {
      const matchesName =
        !q || (s.customer_name || '').toLowerCase().includes(q)
      const matchesYear =
        selectedYear === 'all' || s.harvest_year === parseInt(selectedYear, 10)
      const matchesProduct =
        selectedProduct === 'Tümü' || s.product_name === selectedProduct
      return matchesName && matchesYear && matchesProduct
    })
  }, [sales, searchQuery, selectedYear, selectedProduct])

  const totalRevenue = useMemo(
    () => filteredSales.reduce((s, sale) => s + sale.quantity * sale.price, 0),
    [filteredSales]
  )

  const handleDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    try {
      await dispatch(deleteSale(deleteId)).unwrap()
      setDeleteId(null)
    } catch (err) {
      setDeleteError(err.response?.data?.detail || 'Satış silinemedi')
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
      customer_name: item.customer_name ?? '',
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
      await dispatch(updateSale({ id: editingItem.id, data: editForm })).unwrap()
      setIsEditModalOpen(false)
      setEditingItem(null)
      setEditForm(null)
    } catch (err) {
      setUpdateError(err.response?.data?.detail || 'Satış güncellenemedi')
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div>
      <PageHeader icon={ShoppingCart} title="Satışlar" subtitle="Toptan ürün satışlarını kaydet" />

      <form onSubmit={onSubmit} className="card mb-6 grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <label className="label">Müşteri</label>
          <input
            type="text"
            name="customer_name"
            list="customer-list"
            value={form.customer_name}
            onChange={onChange}
            required
            placeholder="Müşteri adı"
            className="input-field"
          />
          <datalist id="customer-list">
            {customers.map((c) => (
              <option key={c.id} value={c.name} />
            ))}
          </datalist>
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
          <input type="number" step="any" min="0" name="price" value={form.price} onChange={onChange} required className="input-field" />
        </div>
        <div>
          <label className="label">Tarih</label>
          <input type="date" name="date" value={form.date} onChange={onChange} className="input-field" />
        </div>
        <div className="flex items-end">
          <button type="submit" disabled={submitting} className="btn-primary w-full">
            <Save size={16} />
            Satışı Kaydet
          </button>
        </div>
        {formError && <p className="text-sm text-red-600">{formError}</p>}
      </form>

      {error && <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {deleteError && <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{deleteError}</p>}

      <div className="card mb-4 flex items-center justify-between px-5 py-4">
        <span className="text-sm font-medium text-stone-500">Toplam Ciro</span>
        <span className="text-lg font-bold text-green-700">
          {totalRevenue.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} ₺
        </span>
      </div>

      <div className="card mb-4 flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Alıcı adına göre ara..."
            className="input-field pl-9"
            aria-label="Alıcı ara"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2 shadow-sm">
            <span className="text-xs font-semibold uppercase tracking-wide text-stone-400">Hasat Yılı</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="cursor-pointer bg-transparent text-sm font-semibold text-stone-700 outline-none"
              aria-label="Hasat yılı seçimi"
            >
              {FILTER_YEAR_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2 shadow-sm">
            <span className="text-xs font-semibold uppercase tracking-wide text-stone-400">Ürün</span>
            <select
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              className="cursor-pointer bg-transparent text-sm font-semibold text-stone-700 outline-none"
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
              <table className="w-full min-w-[820px] text-sm">
                <thead>
                  <tr className="border-b border-stone-100 bg-stone-50">
                    <th className="th">Tarih</th>
                    <th className="th">Müşteri</th>
                    <th className="th">Ürün</th>
                    <th className="th">Hasat Yılı</th>
                    <th className="th">Miktar (ton)</th>
                    <th className="th">Fiyat (₺/kg)</th>
                    <th className="th">Tutar</th>
                    <th className="th text-right">İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSales.map((s) => (
                    <tr key={s.id} className="border-b border-stone-50 hover:bg-farm-50/50">
                      <td className="td">{new Date(s.date).toLocaleDateString('tr-TR')}</td>
                      <td className="td font-semibold text-stone-800">{s.customer_name}</td>
                      <td className="td">
                        <ProductBadge product={s.product_name} />
                      </td>
                      <td className="td font-medium text-stone-600">{s.harvest_year || '-'}</td>
                      <td className="td">{s.quantity.toLocaleString('tr-TR')}</td>
                      <td className="td">{s.price.toLocaleString('tr-TR')}</td>
                      <td className="td font-medium">{(s.quantity * s.price).toLocaleString('tr-TR', { maximumFractionDigits: 2 })}</td>
                      <td className="td">
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => openEditModal(s)}
                            className="rounded-lg p-2 text-blue-500 transition hover:bg-blue-50 hover:text-blue-700"
                            title="Satışı düzenle"
                          >
                            <Pencil size={18} />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDeleteError('')
                              setDeleteId(s.id)
                            }}
                            className="rounded-lg p-2 text-red-400 transition hover:bg-red-50 hover:text-red-700"
                            title="Satışı sil"
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
              {filteredSales.map((s) => (
                <div key={s.id} className="rounded-2xl border border-stone-100 bg-white p-4 shadow-soft">
                  <div className="mb-3 flex items-center justify-between gap-3 border-b border-stone-100 pb-3">
                    <span className="truncate text-base font-semibold text-stone-800">{s.customer_name}</span>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEditModal(s)}
                        className="shrink-0 rounded-lg p-2 text-blue-500 transition hover:bg-blue-50 hover:text-blue-700"
                        title="Satışı düzenle"
                      >
                        <Pencil size={18} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDeleteError('')
                          setDeleteId(s.id)
                        }}
                        className="shrink-0 rounded-lg p-2 text-red-400 transition hover:bg-red-50 hover:text-red-700"
                        title="Satışı sil"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center justify-between py-2 border-b border-stone-50">
                      <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">Tarih</span>
                      <span className="whitespace-nowrap text-sm font-medium text-stone-800 text-right">{new Date(s.date).toLocaleDateString('tr-TR')}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-stone-50">
                      <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">Hasat Yılı</span>
                      <span className="whitespace-nowrap text-sm font-medium text-stone-800 text-right">{s.harvest_year || '-'}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-stone-50">
                      <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">Ürün</span>
                      <span className="flex items-center gap-2 text-sm font-medium text-stone-800 text-right"><ProductBadge product={s.product_name} /></span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-stone-50">
                      <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">Miktar</span>
                      <span className="whitespace-nowrap text-sm font-medium text-stone-800 text-right">{s.quantity.toLocaleString('tr-TR')} ton</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-stone-50">
                      <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">Fiyat</span>
                      <span className="whitespace-nowrap text-sm font-medium text-stone-800 text-right">{s.price.toLocaleString('tr-TR')} ₺/kg</span>
                    </div>
                    <div className="flex items-center justify-between py-2 last:border-0">
                      <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">Tutar</span>
                      <span className="whitespace-nowrap text-base font-bold text-green-700 text-right">{(s.quantity * s.price).toLocaleString('tr-TR', { maximumFractionDigits: 2 })} ₺</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
        {!loading && sales.length === 0 && <p className="p-4 text-stone-500">Henüz satış eklenmemiş.</p>}
        {!loading && sales.length > 0 && filteredSales.length === 0 && (
          <div className="flex items-center justify-center gap-2 px-4 py-10 text-stone-500">
            <Search size={18} />
            <p className="text-sm">Bu kriterlere uygun satış bulunamadı.</p>
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
          <form onSubmit={handleUpdate} className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                <Pencil className="text-blue-600" size={18} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-stone-800">Satışı Düzenle</h3>
                <p className="text-sm text-stone-500">Satış kaydını güncelleyin ve değişiklikleri kaydedin.</p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="label">Müşteri</label>
                <input
                  type="text"
                  name="customer_name"
                  list="customer-list"
                  value={editForm.customer_name}
                  onChange={onEditChange}
                  required
                  placeholder="Müşteri adı"
                  className="input-field"
                />
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
                <input type="number" step="any" min="0" name="price" value={editForm.price} onChange={onEditChange} required className="input-field" />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Tarih</label>
                <input type="date" name="date" value={editForm.date} onChange={onEditChange} className="input-field" />
              </div>
            </div>

            {updateError && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{updateError}</p>}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  if (!updating) setIsEditModalOpen(false)
                }}
                disabled={updating}
                className="rounded-xl border border-stone-200 px-4 py-2.5 text-sm font-semibold text-stone-600 transition hover:bg-stone-50 disabled:opacity-60"
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={updating}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-green-800 disabled:opacity-60"
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
        title="Satışı Sil"
        message="Bu satışı silmek istediğinize emin misiniz?"
        detail={deleteId ? sales.find((s) => s.id === deleteId)?.customer_name : ''}
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
