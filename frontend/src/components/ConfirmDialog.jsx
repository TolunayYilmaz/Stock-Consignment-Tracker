import { Trash2 } from 'lucide-react'
import TireLoader from './ui/TireLoader'

export default function ConfirmDialog({ open, title, message, detail, confirming, onCancel, onConfirm }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-stone-900/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-stone-900">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/50">
          <Trash2 className="text-red-600 dark:text-red-400" size={22} />
        </div>
        <h3 className="text-center text-lg font-semibold text-stone-800 dark:text-stone-100">{title}</h3>
        <p className="mt-2 text-center text-sm text-stone-500 dark:text-stone-400">{message}</p>
        {detail && (
          <p className="mt-3 rounded-lg bg-stone-50 px-3 py-2 text-center text-sm font-semibold text-stone-700 dark:bg-stone-800 dark:text-stone-300">
            {detail}
          </p>
        )}
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            onClick={onCancel}
            disabled={confirming}
            className="rounded-xl border border-stone-200 px-4 py-2.5 text-sm font-semibold text-stone-600 transition hover:bg-stone-50 disabled:opacity-60 dark:border-stone-700 dark:text-stone-400 dark:hover:bg-stone-800"
          >
            Vazgeç
          </button>
          <button
            onClick={onConfirm}
            disabled={confirming}
            className="flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
          >
            {confirming && <TireLoader className="h-4 w-4" />}
            Evet, Sil
          </button>
        </div>
      </div>
    </div>
  )
}
