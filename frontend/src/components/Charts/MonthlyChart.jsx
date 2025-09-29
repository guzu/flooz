import React, { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { apiService } from '../../services/api'

const MonthlyChart = ({ year }) => {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadMonthlyStats()
  }, [year])

  const loadMonthlyStats = async () => {
    try {
      setLoading(true)
      setError(null)
      const monthlyStats = await apiService.getMonthlyStats(year)
      setData(monthlyStats)
    } catch (error) {
      console.error('Error loading monthly stats:', error)
      setError('Erreur lors du chargement des statistiques mensuelles')
    } finally {
      setLoading(false)
    }
  }

  const formatTooltip = (value, name) => {
    if (name === 'amount') {
      return [
        new Intl.NumberFormat('fr-FR', {
          style: 'currency',
          currency: 'EUR'
        }).format(value),
        'Dépenses'
      ]
    }
    return [value, name]
  }

  const formatYAxisTick = (value) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      notation: 'compact'
    }).format(value)
  }

  if (loading) {
    return (
      <div className="chart-loading">
        <p>Chargement des données...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="chart-error">
        <p>{error}</p>
      </div>
    )
  }

  if (data.length === 0 || data.every(item => item.amount === 0)) {
    return (
      <div className="chart-empty">
        <p>Aucune dépense enregistrée pour {year}</p>
      </div>
    )
  }

  return (
    <div className="monthly-chart">
      <ResponsiveContainer width="100%" height={400}>
        <BarChart
          data={data}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 12 }}
          />
          <YAxis
            tickFormatter={formatYAxisTick}
            tick={{ fontSize: 12 }}
          />
          <Tooltip
            formatter={formatTooltip}
            labelStyle={{ color: '#374151' }}
            contentStyle={{
              backgroundColor: '#ffffff',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
          />
          <Bar
            dataKey="amount"
            fill="#ef4444"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>

      <div className="chart-summary">
        <div className="summary-stats">
          <div className="stat-item">
            <span className="stat-label">Total annuel :</span>
            <span className="stat-value">
              {new Intl.NumberFormat('fr-FR', {
                style: 'currency',
                currency: 'EUR'
              }).format(data.reduce((sum, item) => sum + item.amount, 0))}
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Moyenne mensuelle :</span>
            <span className="stat-value">
              {new Intl.NumberFormat('fr-FR', {
                style: 'currency',
                currency: 'EUR'
              }).format(data.reduce((sum, item) => sum + item.amount, 0) / 12)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MonthlyChart