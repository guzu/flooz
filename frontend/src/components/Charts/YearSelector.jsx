import React from 'react'

const YearSelector = ({ years, selectedYear, onYearChange }) => {
  if (!years || years.length === 0) {
    return null
  }

  return (
    <div className="year-selector">
      <label htmlFor="year-select">Année :</label>
      <select
        id="year-select"
        value={selectedYear}
        onChange={(e) => onYearChange(parseInt(e.target.value))}
        className="year-select"
      >
        {years.map(year => (
          <option key={year} value={year}>
            {year}
          </option>
        ))}
      </select>
    </div>
  )
}

export default YearSelector