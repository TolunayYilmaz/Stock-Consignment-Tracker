import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { ArrowLeftRight, Loader2, Save } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import ProductBadge from '../components/ProductBadge'
import { fetchCustomers } from '../store/slices/customersSlice'
import { addTransaction, fetchTransactions } from '../store/slices/transactionsSlice'
import { PRODUCTS, TRANSACTION_TYPES } from '../api/constants'

const typeCls = {
  Emanet: 'bg-amber-100 text-amber-700',
  'Emanetten Alış': 'bg-blue-100 text-blue-700',
  'Normal Alış': 'bg-green-100 text-green-700',
}

const emptyForm = {
  customer_id: '',
  type: 'Emanet',
  product_name: PRODUCTS[0],
  quantity: '',
  price: '',
  date: '',
}

export default function Transactions() {
  const dispatch = useDispatch()
  const customers = useSelector((state) => state.customers.items)
  const { items: transactions, loading, error } = useSelector((state) => state.transactions)
  const [form, setForm] = useState(emptyForm)
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

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
      setForm(emptyForm)
    } catch (err) {
      setFormError(err.response?.data?.detail || 'İşlem kaydedilemedi')
    } finally {
      setSubmitting(false)
    }
  }

  const totalZarar = transactions.reduce((s, t) => s + t.quantity * t.price, 0)

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

      <div className="card overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center p-10">
            <Loader2 className="animate-spin text-green-700" />
          </div>
        ) : (
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b border-stone-100 bg-stone-50">
                <th className="th">Tarih</th>
                <th className="th">Müşteri</th>
                <th className="th">İşlem</th>
                <th className="th">Ürün</th>
                <th className="th">Miktar (ton)</th>
                <th className="th">Fiyat (₺/kg)</th>
                <th className="th">Tutar</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => (
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
                  <td className="td">{t.quantity.toLocaleString('tr-TR')}</td>
                  <td className="td">{t.price.toLocaleString('tr-TR')}</td>
                  <td className="td font-medium">{totalZarar >= 0 && (t.quantity * t.price).toLocaleString('tr-TR', { maximumFractionDigits: 2 })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && transactions.length === 0 && <p className="p-4 text-stone-500">Henüz işlem eklenmemiş.</p>}
      </div>
    </div>
  )
}