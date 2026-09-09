const START_YEAR = 2024

export function getSeasonYearOptions() {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth()

  let maxYear = currentYear - 1
  if (currentMonth >= 6) {
    maxYear = currentYear
  }

  const seasons = []
  for (let y = maxYear; y >= START_YEAR; y--) {
    seasons.push({ value: y, label: `${y}-${y + 1} Sezonu` })
  }

  seasons.unshift({ value: 'all', label: 'Tümü (Kümülatif)' })
  return seasons
}
