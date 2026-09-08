import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Loader2, Search, UserPlus, Users } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import { addCustomer, fetchCustomers } from '../store/slices/customersSlice'

const fmt = (n) => n?.toLocaleString('tr-TR', { maximumFractionDigits: 3 }) ?? 0

export default function Customers() {
  const dispatch = useDispatch()
  const { items, loading, error } = useSelector((state) => state.customers)
  const [newName, setNewName] = useState('')
  const [query, setQuery] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    dispatch(fetchCustomers())
  }, [dispatch])

  const onSubmit = async (e) => {
    e.preventDefault()
    setFormError('')
    if (!newName.trim()) return
    setSubmitting(true)
    try {
      await dispatch(addCustomer({ name: newName.trim() })).unwrap()
      setNewName('')
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Müşteri eklenemedi')
    } finally {
      setSubmitting(false)
    }
  }

  const { filtered, products } = useMemo(() => {
    const filtered = items.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()))
    const products = items[0] ? Object.keys(items[0].balances || {}) : []
    return { filtered, products }
  }, [items, query])

  return (
    <div>
      <PageHeader icon={Users} title="Müşteriler ve Emanet Bakiyeleri" subtitle="Ton cinsinden emanet durumu" />

      <div className="card mb-5 p-4">
        <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex-1">
            <label className="label">Yeni müşteri</label>
            <input
              type="text"
              placeholder="Müşteri adı"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="input-field"
            />
          </div>
          <div className="flex items-end">
            <button type="submit" disabled={submitting} className="btn-primary w-full sm:w-auto">
              <UserPlus size={16} />
              Ekle
            </button>
          </div>
        </form>
        {formError && <p className="mt-3 text-sm text-red-600">{formError}</p>}
      </div>

      <div className="mb-4 flex items-center gap-2 rounded-xl bg-white px-3 py-2 shadow-soft sm:max-w-sm">
        <Search size={16} className="text-stone-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Müşteri ara..."
          className="w-full bg-transparent text-sm outline-none"
        />
      </div>

      {error && <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <div className="card overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center p-10">
            <Loader2 className="animate-spin text-green-700" />
          </div>
        ) : (
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-stone-100 bg-stone-50">
                <th className="th">Müşteri</th>
                {products.map((p) => (
                  <th key={p} className="th">
                    {p} (ton)
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-b border-stone-50 hover:bg-farm-50/50">
                  <td className="td font-semibold text-stone-800">{c.name}</td>
                  {products.map((p) => {
                    const v = c.balances?.[p] ?? 0
                    return (
                      <td key={p} className={`td ${v > 0 ? 'font-semibold text-green-700' : 'text-stone-400'}`}>
                        {fmt(v)}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && filtered.length === 0 && (
          <p className="p-4 text-stone-500">Müşteri bulunamadı.</p>
        )}
      </div>
    </div>
  )
}