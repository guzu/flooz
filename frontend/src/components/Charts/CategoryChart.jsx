import React, { useState, useEffect } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { apiService } from '../../services/api'

const CategoryChart = ({ year }) => {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadCategoryStats()
  }, [year])

  const loadCategoryStats = async () => {
    try {
      setLoading(true)
      setError(null)
      const categoryStats = await apiService.getCategoryStats(year)

      // Filter out categories with no spending and format data
      const formattedData = categoryStats
        .filter(item => item.amount > 0)
        .map(item => ({
          name: item.category_name,
          value: item.amount,
          percentage: item.percentage,
          color: item.color,
          transaction_count: item.transaction_count
        }))

      setData(formattedData)
    } catch (error) {
      console.error('Error loading category stats:', error)
      setError('Erreur lors du chargement des statistiques par catégorie')
    } finally {
      setLoading(false)
    }
  }

  const formatTooltip = (value, name, props) => {
    return [
      [
        new Intl.NumberFormat('fr-FR', {
          style: 'currency',
          currency: 'EUR'
        }).format(value),
        `${props.payload.percentage}%`,
        `${props.payload.transaction_count} transaction(s)`
      ],
      name
    ]
  }

  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    if (percent < 0.05) return null // Don't show labels for slices smaller than 5%

    const RADIAN = Math.PI / 180
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        fontSize="12"
        fontWeight="bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    )
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

  if (data.length === 0) {
    return (
      <div className="chart-empty">
        <p>Aucune dépense par catégorie pour {year}</p>
      </div>
    )
  }

  return (
    <div className="category-chart">
      <ResponsiveContainer width="100%" height={400}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderCustomLabel}
            outerRadius={120}
            fill="#8884d8"
            dataKey="value"
            stroke="#ffffff"
            strokeWidth={2}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={formatTooltip}
            contentStyle={{
              backgroundColor: '#ffffff',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
          />
          <Legend
            verticalAlign="bottom"
            height={36}
            formatter={(value, entry) => (
              <span style={{ color: entry.color }}>
                {value} ({entry.payload.percentage}%)
              </span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>

      <div className="chart-summary">
        <div className="category-breakdown">
          <h4>Répartition détaillée :</h4>
          <div className="category-list">
            {data.map((item, index) => (
              <div key={index} className="category-item">
                <div className="category-info">
                  <div
                    className="category-color"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="category-name">{item.name}</span>
                </div>
                <div className="category-stats">
                  <span className="category-amount">
                    {new Intl.NumberFormat('fr-FR', {
                      style: 'currency',
                      currency: 'EUR'
                    }).format(item.value)}
                  </span>
                  <span className="category-percentage">
                    {item.percentage}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default CategoryChart