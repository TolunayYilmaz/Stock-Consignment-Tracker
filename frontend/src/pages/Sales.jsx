import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Loader2, Save, ShoppingCart } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import ProductBadge from '../components/ProductBadge'
import { fetchCustomers } from '../store/slices/customersSlice'
import { addSale, fetchSales } from '../store/slices/salesSlice'
import { PRODUCTS } from '../api/constants'

const emptyForm = {
  customer_name: '',
  product_name: PRODUCTS[0],
  quantity: '',
  price: '',
  date: '',
}

export default function Sales() {
  const dispatch = useDispatch()
  const customers = useSelector((state) => state.customers.items)
  const { items: sales, loading, error } = useSelector((state) => state.sales)
  const [form, setForm] = useState(emptyForm)
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

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

  const totalRevenue = useMemo(
    () => sales.reduce((s, sale) => s + sale.quantity * sale.price, 0),
    [sales]
  )

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

      <div className="card mb-4 flex items-center justify-between px-5 py-4">
        <span className="text-sm font-medium text-stone-500">Toplam Ciro</span>
        <span className="text-lg font-bold text-green-700">
          {totalRevenue.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} ₺
        </span>
      </div>

      <div className="card overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center p-10">
            <Loader2 className="animate-spin text-green-700" />
          </div>
        ) : (
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-stone-100 bg-stone-50">
                <th className="th">Tarih</th>
                <th className="th">Müşteri</th>
                <th className="th">Ürün</th>
                <th className="th">Miktar (ton)</th>
                <th className="th">Fiyat (₺/kg)</th>
                <th className="th">Tutar</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((s) => (
                <tr key={s.id} className="border-b border-stone-50 hover:bg-farm-50/50">
                  <td className="td">{new Date(s.date).toLocaleDateString('tr-TR')}</td>
                  <td className="td font-semibold text-stone-800">{s.customer_name}</td>
                  <td className="td">
                    <ProductBadge product={s.product_name} />
                  </td>
                  <td className="td">{s.quantity.toLocaleString('tr-TR')}</td>
                  <td className="td">{s.price.toLocaleString('tr-TR')}</td>
                  <td className="td font-medium">{(s.quantity * s.price).toLocaleString('tr-TR', { maximumFractionDigits: 2 })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && sales.length === 0 && <p className="p-4 text-stone-500">Henüz satış eklenmemiş.</p>}
      </div>
    </div>
  )
}