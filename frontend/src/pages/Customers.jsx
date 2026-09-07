import { useState, useEffect } from 'react'
import api from '../api/client'
import { PRODUCTS } from '../api/constants'

export default function Customers() {
  const [customers, setCustomers] = useState([])
  const [newName, setNewName] = useState('')
  const [error, setError] = useState('')

  const fetchCustomers = async () => {
    const res = await api.get('/customers')
    setCustomers(res.data)
  }

  useEffect(() => {
    fetchCustomers()
  }, [])

  const addCustomer = async (e) => {
    e.preventDefault()
    setError('')
    if (!newName.trim()) return
    try {
      await api.post('/customers', { name: newName.trim() })
      setNewName('')
      fetchCustomers()
    } catch (err) {
      setError(err.response?.data?.detail || 'Müşteri eklenemedi')
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Müşteriler ve Emanet Bakiyeleri</h1>
      <form onSubmit={addCustomer} className="flex gap-3 mb-6 max-w-md">
        <input
          type="text"
          placeholder="Yeni müşteri adı"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className="flex-1 px-3 py-2 border rounded-md"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
        >
          Ekle
        </button>
      </form>
      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-100 text-left">
              <th className="p-3">Müşteri</th>
              {PRODUCTS.map((p) => (
                <th key={p} className="p-3">
                  {p} (kg)
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id} className="border-t">
                <td className="p-3 font-medium">{c.name}</td>
                {PRODUCTS.map((p) => (
                  <td key={p} className={`p-3 ${c.balances?.[p] > 0 ? 'text-green-700 font-semibold' : 'text-gray-500'}`}>
                    {c.balances?.[p]?.toLocaleString('tr-TR', { maximumFractionDigits: 3 }) ?? 0}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {customers.length === 0 && (
          <p className="p-4 text-gray-500">Henüz müşteri eklenmemiş.</p>
        )}
      </div>
    </div>
  )
}