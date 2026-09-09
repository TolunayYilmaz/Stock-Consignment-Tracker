const START_YEAR = 2020

function buildYearOptions() {
  const currentYear = new Date().getFullYear()
  const years = []
  for (let y = currentYear; y >= START_YEAR; y--) {
    years.push({ value: y, label: String(y) })
  }
  return years
}

export function getHarvestYearOptions() {
  return buildYearOptions()
}

export function getHarvestYearFilterOptions() {
  return [{ value: 'all', label: 'Tümü' }, ...buildYearOptions()]
}