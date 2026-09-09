export default function TireLoader({ className = "w-10 h-10" }) {
  return (
    <svg viewBox="0 0 100 100" className={`animate-spin ${className}`}>
      {/* Traktör Dış Dişleri (Treads) */}
      <circle cx="50" cy="50" r="42" stroke="#1f2937" strokeWidth="16" strokeDasharray="14 10" fill="none" />
      {/* Lastik Gövdesi */}
      <circle cx="50" cy="50" r="38" fill="#374151" />
      {/* İç Çelik Jant (Rim) */}
      <circle cx="50" cy="50" r="22" fill="#cbd5e1" />
      {/* Jant Çerçevesi */}
      <circle cx="50" cy="50" r="22" stroke="#94a3b8" strokeWidth="2" fill="none" />
      {/* Merkez Göbek */}
      <circle cx="50" cy="50" r="8" fill="#475569" />
      {/* Bijonlar (Lug Nuts) */}
      <circle cx="38" cy="50" r="3" fill="#334155" />
      <circle cx="62" cy="50" r="3" fill="#334155" />
      <circle cx="50" cy="38" r="3" fill="#334155" />
      <circle cx="50" cy="62" r="3" fill="#334155" />
    </svg>
  )
}