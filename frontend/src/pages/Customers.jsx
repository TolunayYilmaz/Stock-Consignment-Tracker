import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Search, Trash2, UserPlus, Users } from 'lucide-react'
import TireLoader from '../components/ui/TireLoader'
import PageHeader from '../components/PageHeader'
import ConfirmDialog from '../components/ConfirmDialog'
import { addCustomer, deleteCustomer, fetchCustomers } from '../store/slices/customersSlice'

const fmt = (n) => n?.toLocaleString('tr-TR', { maximumFractionDigits: 3 }) ?? 0

export default function Customers() {
  const dispatch = useDispatch()
  const { items, loading, error } = useSelector((state) => state.customers)
  const [newName, setNewName] = useState('')
  const [query, setQuery] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [deleteId, setDeleteId] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

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

  const handleDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    try {
      await dispatch(deleteCustomer(deleteId)).unwrap()
      setDeleteId(null)
    } catch (err) {
      setDeleteError(err.response?.data?.detail || 'Müşteri silinemedi')
      setDeleteId(null)
    } finally {
      setDeleting(false)
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
      {deleteError && <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{deleteError}</p>}

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
                    <th className="th">Müşteri</th>
                    {products.map((p) => (
                      <th key={p} className="th">
                        {p} (ton)
                      </th>
                    ))}
                    <th className="th text-right">İşlemler</th>
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
                      <td className="td">
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => {
                              setDeleteError('')
                              setDeleteId(c.id)
                            }}
                            className="rounded-lg p-2 text-red-400 transition hover:bg-red-50 hover:text-red-700"
                            title="Müşteriyi sil"
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
              {filtered.map((c) => (
                <div key={c.id} className="rounded-2xl border border-stone-100 bg-white p-4 shadow-soft">
                  <div className="mb-3 flex items-center justify-between gap-3 border-b border-stone-100 pb-3">
                    <span className="truncate text-base font-semibold text-stone-800">{c.name}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setDeleteError('')
                        setDeleteId(c.id)
                      }}
                      className="shrink-0 rounded-lg p-2 text-red-400 transition hover:bg-red-50 hover:text-red-700"
                      title="Müşteriyi sil"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                  <div className="flex flex-col">
                    {products.map((p) => {
                      const v = c.balances?.[p] ?? 0
                      return (
                        <div key={p} className="flex items-center justify-between border-b border-stone-100 py-2 last:border-0">
                          <span className="text-sm text-stone-500">{p}</span>
                          <span className={`whitespace-nowrap text-sm font-semibold ${v > 0 ? 'text-green-700' : 'text-stone-400'}`}>{fmt(v)} ton</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
        {!loading && filtered.length === 0 && (
          <p className="p-4 text-stone-500">Müşteri bulunamadı.</p>
        )}
      </div>

      <ConfirmDialog
        open={deleteId !== null}
        title="Müşteriyi Sil"
        message="Bu müşteriyi silmek istediğinize emin misiniz?"
        detail={deleteId ? items.find((c) => c.id === deleteId)?.name : ''}
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