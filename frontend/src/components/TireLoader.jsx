import { CircleDashed } from 'lucide-react'

export default function TireLoader({ size = 22, className = 'text-green-700' }) {
  return (
    <span className={`relative inline-flex items-center justify-center ${className}`}>
      <CircleDashed className="animate-spin" size={size} strokeWidth={2.5} />
      <span
        className="absolute rounded-full bg-current"
        style={{ width: size / 5, height: size / 5, opacity: 0.5 }}
      />
    </span>
  )
}
