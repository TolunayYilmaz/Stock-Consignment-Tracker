import { useState, useEffect } from 'react'
import api from '../api/client'
import { PRODUCTS } from '../api/constants'

export default function Sales() {
  const [sales, setSales] = useState([])
  const [customers, setCustomers] = useState([])
  const [form, setForm] = useState({
    customer_name: '',
    product_name: PRODUCTS[0],
    quantity: '',
    price: '',
    date: '',
  })
  const [error, setError] = useState('')

  const fetchData = async () => {
    const [sRes, cRes] = await Promise.all([api.get('/sales'), api.get('/customers')])
    setSales(sRes.data)
    setCustomers(cRes.data)
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
        customer_name: form.customer_name,
        product_name: form.product_name,
        quantity: parseFloat(form.quantity),
        price: parseFloat(form.price) || 0,
      }
      if (form.date) payload.date = new Date(form.date).toISOString()
      await api.post('/sales', payload)
      setForm({
        customer_name: '',
        product_name: PRODUCTS[0],
        quantity: '',
        price: '',
        date: '',
      })
      fetchData()
    } catch (err) {
      setError(err.response?.data?.detail || 'Satış kaydedilemedi')
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Satışlar</h1>
      <form onSubmit={onSubmit} className="bg-white rounded-lg shadow p-4 mb-6 grid grid-cols-2 md:grid-cols-5 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Müşteri</label>
          <input
            type="text"
            name="customer_name"
            list="customer-list"
            value={form.customer_name}
            onChange={onChange}
            required
            placeholder="Müşteri adı"
            className="w-full px-2 py-2 border rounded-md"
          />
          <datalist id="customer-list">
            {customers.map((c) => (
              <option key={c.id} value={c.name} />
            ))}
          </datalist>
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
            required
            className="w-full px-2 py-2 border rounded-md"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Tarih</label>
          <input type="date" name="date" value={form.date} onChange={onChange} className="w-full px-2 py-2 border rounded-md" />
        </div>
        <div className="col-span-2 md:col-span-5">
          <button type="submit" className="px-5 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
            Satışı Kaydet
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
              <th className="p-3">Ürün</th>
              <th className="p-3">Miktar (kg)</th>
              <th className="p-3">Fiyat (₺/kg)</th>
              <th className="p-3">Tutar</th>
            </tr>
          </thead>
          <tbody>
            {sales.map((s) => (
              <tr key={s.id} className="border-t">
                <td className="p-3">{new Date(s.date).toLocaleDateString('tr-TR')}</td>
                <td className="p-3">{s.customer_name}</td>
                <td className="p-3">{s.product_name}</td>
                <td className="p-3">{s.quantity.toLocaleString('tr-TR')}</td>
                <td className="p-3">{s.price.toLocaleString('tr-TR')}</td>
                <td className="p-3">{(s.quantity * s.price).toLocaleString('tr-TR', { maximumFractionDigits: 2 })}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {sales.length === 0 && <p className="p-4 text-gray-500">Henüz satış eklenmemiş.</p>}
      </div>
    </div>
  )
}