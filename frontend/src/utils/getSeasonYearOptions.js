const START_YEAR = 2024

export function getSeasonYearOptions() {
  const currentYear = new Date().getFullYear()

  const years = []
  for (let y = currentYear; y >= START_YEAR; y--) {
    years.push({ value: y, label: String(y) })
  }

  years.unshift({ value: 'all', label: 'Tümü' })
  return years
}
