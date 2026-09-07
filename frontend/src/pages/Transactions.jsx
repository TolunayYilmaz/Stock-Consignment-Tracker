import { useState, useEffect } from 'react'
import api from '../api/client'
import { PRODUCTS, TRANSACTION_TYPES } from '../api/constants'

export default function Transactions() {
  const [customers, setCustomers] = useState([])
  const [transactions, setTransactions] = useState([])
  const [form, setForm] = useState({
    customer_id: '',
    type: 'Normal Alış',
    product_name: PRODUCTS[0],
    quantity: '',
    price: '',
    date: '',
  })
  const [error, setError] = useState('')

  const fetchData = async () => {
    const [cRes, tRes] = await Promise.all([api.get('/customers'), api.get('/transactions')])
    setCustomers(cRes.data)
    setTransactions(tRes.data)
  }

  useEffect(() => {
    fetchData()
  }, [])

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const payload = {
        customer_id: Number(form.customer_id),
        type: form.type,
        product_name: form.product_name,
        quantity: parseFloat(form.quantity),
        price: parseFloat(form.price) || 0,
      }
      if (form.date) payload.date = new Date(form.date).toISOString()
      await api.post('/transactions', payload)
      setForm({
        customer_id: '',
        type: 'Normal Alış',
        product_name: PRODUCTS[0],
        quantity: '',
        price: '',
        date: '',
      })
      fetchData()
    } catch (err) {
      setError(err.response?.data?.detail || 'İşlem kaydedilemedi')
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Alış ve Emanet İşlemleri</h1>
      <form onSubmit={onSubmit} className="bg-white rounded-lg shadow p-4 mb-6 grid grid-cols-2 md:grid-cols-6 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Müşteri</label>
          <select
            name="customer_id"
            value={form.customer_id}
            onChange={onChange}
            required
            className="w-full px-2 py-2 border rounded-md"
          >
            <option value="">Seçin</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">İşlem Tipi</label>
          <select name="type" value={form.type} onChange={onChange} className="w-full px-2 py-2 border rounded-md">
            {TRANSACTION_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Ürün</label>
          <select name="product_name" value={form.product_name} onChange={onChange} className="w-full px-2 py-2 border rounded-md">
            {PRODUCTS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Miktar (kg)</label>
          <input
            type="number"
            step="any"
            min="0"
            name="quantity"
            value={form.quantity}
            onChange={onChange}
            required
            className="w-full px-2 py-2 border rounded-md"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Fiyat (₺/kg)</label>
          <input
            type="number"
            step="any"
            min="0"
            name="price"
            value={form.price}
            onChange={onChange}
            disabled={form.type === 'Emanet'}
            className="w-full px-2 py-2 border rounded-md disabled:bg-gray-100"
          />
          {form.type === 'Emanet' && (
            <p className="text-[10px] text-green-600 mt-0.5">Emanette fiyat otomatik 0</p>
          )}
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Tarih</label>
          <input type="date" name="date" value={form.date} onChange={onChange} className="w-full px-2 py-2 border rounded-md" />
        </div>
        <div className="col-span-2 md:col-span-6">
          <button type="submit" className="px-5 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
            Kaydet
          </button>
        </div>
      </form>
      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-100 text-left">
              <th className="p-3">Tarih</th>
              <th className="p-3">Müşteri</th>
              <th className="p-3">İşlem</th>
              <th className="p-3">Ürün</th>
              <th className="p-3">Miktar (kg)</th>
              <th className="p-3">Fiyat (₺/kg)</th>
              <th className="p-3">Tutar</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((t) => (
              <tr key={t.id} className="border-t">
                <td className="p-3">{new Date(t.date).toLocaleDateString('tr-TR')}</td>
                <td className="p-3">{t.customer_name}</td>
                <td className="p-3">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      t.type === 'Emanet'
                        ? 'bg-amber-100 text-amber-700'
                        : t.type === 'Emanetten Alış'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-green-100 text-green-700'
                    }`}
                  >
                    {t.type}
                  </span>
                </td>
                <td className="p-3">{t.product_name}</td>
                <td className="p-3">{t.quantity.toLocaleString('tr-TR')}</td>
                <td className="p-3">{t.price.toLocaleString('tr-TR')}</td>
                <td className="p-3">{(t.quantity * t.price).toLocaleString('tr-TR', { maximumFractionDigits: 2 })}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {transactions.length === 0 && <p className="p-4 text-gray-500">Henüz işlem eklenmemiş.</p>}
      </div>
    </div>
  )
}