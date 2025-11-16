import React from 'react'
import { useTranslation } from 'react-i18next'

const YearSelector = ({ years, selectedYear, onYearChange, variant = 'dropdown' }) => {
  const { t } = useTranslation(['transactions'])
  if (!years || years.length === 0) {
    return null
  }

  // Sort years: ascending for buttons (oldest first), descending for dropdown (most recent first)
  const sortedYears = [...years].sort((a, b) => variant === 'buttons' ? a - b : b - a)

  // Horizontal buttons variant for stats page
  if (variant === 'buttons') {
    return (
      <div className="year-selector-buttons">
        {sortedYears.map(year => (
          <button
            key={year}
            className={`year-button ${selectedYear === year ? 'active' : ''}`}
            onClick={() => onYearChange(year)}
          >
            {year}
          </button>
        ))}
      </div>
    )
  }

  // Default dropdown variant
  return (
    <div className="year-selector">
      <label htmlFor="year-select">{t('yearSelector.label')}</label>
      <select
        id="year-select"
        value={selectedYear}
        onChange={(e) => onYearChange(parseInt(e.target.value))}
        className="year-select"
      >
        {sortedYears.map(year => (
          <option key={year} value={year}>
            {year}
          </option>
        ))}
      </select>
    </div>
  )
}

export default YearSelector