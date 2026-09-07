import { Bean, Flower2, Sprout, Wheat } from 'lucide-react'

const PRODUCT_MAP = {
  Arpa: { Icon: Wheat, cls: 'bg-amber-100 text-amber-700' },
  Buğday: { Icon: Wheat, cls: 'bg-yellow-100 text-yellow-700' },
  Mısır: { Icon: Bean, cls: 'bg-orange-100 text-orange-700' },
  'Yağlık Ayçekirdeği': { Icon: Flower2, cls: 'bg-emerald-100 text-emerald-700' },
  'Çerezlik Çekirdek': { Icon: Flower2, cls: 'bg-lime-100 text-lime-700' },
}

export default function ProductBadge({ product, showName = true, size = 14 }) {
  const { Icon, cls } = PRODUCT_MAP[product] || { Icon: Sprout, cls: 'bg-stone-100 text-stone-600' }
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <span className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${cls}`}>
        <Icon size={size} />
      </span>
      {showName && <span className="font-medium text-stone-800">{product}</span>}
    </span>
  )
}