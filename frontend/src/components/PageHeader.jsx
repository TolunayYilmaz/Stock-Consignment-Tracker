export default function PageHeader({ icon: Icon, title, subtitle }) {
  return (
    <div className="mb-6 flex items-center gap-3">
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-green-700 text-white shadow-soft">
        <Icon size={22} />
      </span>
      <div>
        <h1 className="text-xl font-bold text-stone-800 sm:text-2xl">{title}</h1>
        {subtitle && <p className="text-sm text-stone-500">{subtitle}</p>}
      </div>
    </div>
  )
}