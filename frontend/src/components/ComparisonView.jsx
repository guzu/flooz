import React, { useState, useEffect } from 'react'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { apiService } from '../services/api'

const ComparisonView = ({ availableYears }) => {
  const currentYear = new Date().getFullYear()
  const [year1, setYear1] = useState(availableYears?.includes(currentYear - 1) ? currentYear - 1 : availableYears?.[0] || currentYear)
  const [year2, setYear2] = useState(availableYears?.includes(currentYear) ? currentYear : availableYears?.[1] || currentYear)
  const [useDateRange, setUseDateRange] = useState(false)
  const [startMonth, setStartMonth] = useState(1)
  const [endMonth, setEndMonth] = useState(12)
  const [data1, setData1] = useState(null)
  const [data2, setData2] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadComparisonData()
  }, [year1, year2, startMonth, endMonth, useDateRange])

  const loadComparisonData = async () => {
    try {
      setLoading(true)
      const [monthly1, monthly2, category1, category2] = await Promise.all([
        apiService.getMonthlyStats(year1),
        apiService.getMonthlyStats(year2),
        apiService.getCategoryStats(year1),
        apiService.getCategoryStats(year2)
      ])

      setData1({
        monthly: monthly1,
        by_category: category1.reduce((acc, cat) => {
          acc[cat.category_name] = { total: cat.amount }
          return acc
        }, {})
      })

      setData2({
        monthly: monthly2,
        by_category: category2.reduce((acc, cat) => {
          acc[cat.category_name] = { total: cat.amount }
          return acc
        }, {})
      })
    } catch (error) {
      console.error('Error loading comparison data:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterByMonthRange = (data) => {
    if (!useDateRange || !data) return data
    return {
      ...data,
      monthly: data.monthly?.filter(m => m.month_num >= startMonth && m.month_num <= endMonth)
    }
  }

  const getMonthlyComparisonData = () => {
    const filtered1 = filterByMonthRange(data1)
    const filtered2 = filterByMonthRange(data2)

    if (!filtered1?.monthly || !filtered2?.monthly) return []

    const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']
    const result = []

    for (let i = (useDateRange ? startMonth : 1); i <= (useDateRange ? endMonth : 12); i++) {
      const month1 = filtered1.monthly.find(m => m.month_num === i)
      const month2 = filtered2.monthly.find(m => m.month_num === i)

      result.push({
        month: months[i - 1],
        [year1]: month1?.amount || 0,
        [year2]: month2?.amount || 0
      })
    }

    return result
  }

  const getCumulativeData = () => {
    const filtered1 = filterByMonthRange(data1)
    const filtered2 = filterByMonthRange(data2)

    if (!filtered1?.monthly || !filtered2?.monthly) return []

    const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']
    const result = []
    let cumul1 = 0
    let cumul2 = 0

    const startIdx = useDateRange ? startMonth : 1
    const endIdx = useDateRange ? endMonth : 12

    // Add initial point at 0 with empty label
    result.push({
      month: '',
      [year1]: 0,
      [year2]: 0
    })

    for (let i = startIdx; i <= endIdx; i++) {
      const month1 = filtered1.monthly.find(m => m.month_num === i)
      const month2 = filtered2.monthly.find(m => m.month_num === i)

      cumul1 += month1?.amount || 0
      cumul2 += month2?.amount || 0

      result.push({
        month: months[i - 1],
        [year1]: cumul1,
        [year2]: cumul2
      })
    }

    return result
  }

  const getCategoryComparisonData = () => {
    const filtered1 = filterByMonthRange(data1)
    const filtered2 = filterByMonthRange(data2)

    if (!filtered1?.by_category || !filtered2?.by_category) return []

    const allCategories = new Set([
      ...Object.keys(filtered1.by_category),
      ...Object.keys(filtered2.by_category)
    ])

    const result = Array.from(allCategories).map(category => {
      const amount1 = filtered1.by_category[category]?.total || 0
      const amount2 = filtered2.by_category[category]?.total || 0
      const avg = (amount1 + amount2) / 2

      return {
        category,
        [year1]: amount1,
        [year2]: amount2,
        avg
      }
    })

    return result.sort((a, b) => b.avg - a.avg).slice(0, 10)
  }

  const calculateKPIs = () => {
    const filtered1 = filterByMonthRange(data1)
    const filtered2 = filterByMonthRange(data2)

    if (!filtered1?.monthly || !filtered2?.monthly) {
      return { total1: 0, total2: 0, avg1: 0, avg2: 0, variation: 0 }
    }

    const total1 = filtered1.monthly.reduce((sum, m) => sum + (m.amount || 0), 0)
    const total2 = filtered2.monthly.reduce((sum, m) => sum + (m.amount || 0), 0)
    const count1 = filtered1.monthly.filter(m => m.amount > 0).length || 1
    const count2 = filtered2.monthly.filter(m => m.amount > 0).length || 1
    const avg1 = total1 / count1
    const avg2 = total2 / count2
    const variation = total1 > 0 ? ((total2 - total1) / total1) * 100 : 0

    return { total1, total2, avg1, avg2, variation }
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  if (loading) {
    return (
      <div className="loading">
        <p>Chargement des données de comparaison...</p>
      </div>
    )
  }

  const kpis = calculateKPIs()
  const monthlyData = getMonthlyComparisonData()
  const cumulativeData = getCumulativeData()
  const categoryData = getCategoryComparisonData()

  return (
    <div className="stats-container">
      <div className="stats-header">
        <h2>Comparaison d'années</h2>
      </div>

      {/* Sélecteurs */}
      <div className="comparison-selectors">
        <div className="year-selectors-row">
          <div className="year-selectors">
            <div className="year-selector-group">
              <select value={year1} onChange={(e) => setYear1(parseInt(e.target.value))} className="year-select">
                {availableYears?.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
            <span className="vs-label">VS</span>
            <div className="year-selector-group">
              <select value={year2} onChange={(e) => setYear2(parseInt(e.target.value))} className="year-select">
                {availableYears?.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="date-range-toggle">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={useDateRange}
                onChange={(e) => setUseDateRange(e.target.checked)}
              />
              <span>Période spécifique</span>
            </label>
          </div>
        </div>

        {useDateRange && (
          <div className="month-range-selectors">
            <div className="month-selector-group">
              <label>De :</label>
              <select value={startMonth} onChange={(e) => setStartMonth(parseInt(e.target.value))} className="year-select">
                {Array.from({length: 12}, (_, i) => i + 1).map(m => (
                  <option key={m} value={m}>
                    {['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'][m - 1]}
                  </option>
                ))}
              </select>
            </div>
            <div className="month-selector-group">
              <label>À :</label>
              <select value={endMonth} onChange={(e) => setEndMonth(parseInt(e.target.value))} className="year-select">
                {Array.from({length: 12}, (_, i) => i + 1).filter(m => m >= startMonth).map(m => (
                  <option key={m} value={m}>
                    {['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'][m - 1]}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* KPIs */}
      <div className="comparison-kpis">
        <div className="kpi-card">
          <div className="kpi-label">Total {year1}</div>
          <div className="kpi-value">{formatCurrency(kpis.total1)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Total {year2}</div>
          <div className="kpi-value">{formatCurrency(kpis.total2)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Variation</div>
          <div className={`kpi-value ${kpis.variation > 0 ? 'negative' : 'positive'}`}>
            {kpis.variation > 0 ? '+' : ''}{kpis.variation.toFixed(1)}%
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Moyenne mensuelle {year1}</div>
          <div className="kpi-value">{formatCurrency(kpis.avg1)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Moyenne mensuelle {year2}</div>
          <div className="kpi-value">{formatCurrency(kpis.avg2)}</div>
        </div>
      </div>

      {/* Graphique mensuel */}
      <div className="chart-section">
        <h3>Comparaison mensuelle</h3>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip formatter={(value) => formatCurrency(value)} />
            <Legend />
            <Bar dataKey={year1} fill="#a78bfa" name={`${year1}`} />
            <Bar dataKey={year2} fill="#6ee7b7" name={`${year2}`} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Graphique cumulé */}
      <div className="chart-section">
        <h3>Évolution cumulée</h3>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={cumulativeData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="month"
              interval={0}
              tick={{ fontSize: 12 }}
              tickLine={false}
            />
            <YAxis />
            <Tooltip
              formatter={(value) => formatCurrency(value)}
              labelFormatter={(label) => label}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const value1 = payload[0].value
                  const value2 = payload[1].value
                  const diff = value2 - value1
                  return (
                    <div style={{ backgroundColor: 'white', padding: '10px', border: '1px solid #ccc', borderRadius: '4px' }}>
                      <p style={{ margin: '0 0 5px 0', fontWeight: 'bold' }}>{payload[0].payload.month}</p>
                      <p style={{ margin: '5px 0', color: '#a78bfa' }}>{year1}: {formatCurrency(value1)}</p>
                      <p style={{ margin: '5px 0', color: '#6ee7b7' }}>{year2}: {formatCurrency(value2)}</p>
                      <p style={{ margin: '5px 0 0 0', fontWeight: 'bold', color: diff > 0 ? '#f87171' : '#4ade80' }}>
                        {diff > 0 ? '+' : ''}{formatCurrency(diff)}
                      </p>
                    </div>
                  )
                }
                return null
              }}
            />
            <Legend />
            <Line type="monotone" dataKey={year1} stroke="#a78bfa" strokeWidth={2} name={`${year1}`} dot={false} />
            <Line type="monotone" dataKey={year2} stroke="#6ee7b7" strokeWidth={2} name={`${year2}`} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Comparaison par catégorie */}
      <div className="chart-section">
        <h3>Comparaison par catégorie (Top 10)</h3>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={categoryData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis dataKey="category" type="category" width={150} />
            <Tooltip formatter={(value) => formatCurrency(value)} />
            <Legend />
            <Bar dataKey={year1} fill="#a78bfa" name={`${year1}`} />
            <Bar dataKey={year2} fill="#6ee7b7" name={`${year2}`} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export default ComparisonView
