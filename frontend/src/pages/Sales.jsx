import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Save, Search, ShoppingCart, Trash2 } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import ProductBadge from '../components/ProductBadge'
import TireLoader from '../components/ui/TireLoader'
import ConfirmDialog from '../components/ConfirmDialog'
import { fetchCustomers } from '../store/slices/customersSlice'
import { addSale, deleteSale, fetchSales } from '../store/slices/salesSlice'
import { PRODUCTS } from '../api/constants'

const emptyForm = {
  customer_name: '',
  product_name: PRODUCTS[0],
  quantity: '',
  price: '',
  date: '',
}

const YEAR_OPTIONS = ['Tümü', '2026', '2025', '2024']

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
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedYear, setSelectedYear] = useState('Tümü')

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
      setForm(emptyForm)
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
        selectedYear === 'Tümü' || new Date(s.date).getFullYear() === parseInt(selectedYear, 10)
      return matchesName && matchesYear
    })
  }, [sales, searchQuery, selectedYear])

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
        <div className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wide text-stone-400">Yıl</span>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="cursor-pointer bg-transparent text-sm font-semibold text-stone-700 outline-none"
            aria-label="Yıl seçimi"
          >
            {YEAR_OPTIONS.map((y) => (
              <option key={y} value={y}>
                {y}
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
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b border-stone-100 bg-stone-50">
                <th className="th">Tarih</th>
                <th className="th">Müşteri</th>
                <th className="th">Ürün</th>
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
                  <td className="td">{s.quantity.toLocaleString('tr-TR')}</td>
                  <td className="td">{s.price.toLocaleString('tr-TR')}</td>
                  <td className="td font-medium">{(s.quantity * s.price).toLocaleString('tr-TR', { maximumFractionDigits: 2 })}</td>
                  <td className="td">
                    <div className="flex justify-end">
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
        )}
        {!loading && sales.length === 0 && <p className="p-4 text-stone-500">Henüz satış eklenmemiş.</p>}
        {!loading && sales.length > 0 && filteredSales.length === 0 && (
          <div className="flex items-center justify-center gap-2 px-4 py-10 text-stone-500">
            <Search size={18} />
            <p className="text-sm">Bu kriterlere uygun satış bulunamadı.</p>
          </div>
        )}
      </div>

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