import React, { useState, useEffect } from 'react'
import { Sankey, Tooltip, ResponsiveContainer } from 'recharts'
import { apiService } from '../../services/api'

const SankeyChart = ({ year }) => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [displayMode, setDisplayMode] = useState('currency') // 'currency' or 'percentage'

  useEffect(() => {
    loadSankeyData()
  }, [year])

  const loadSankeyData = async () => {
    try {
      setLoading(true)
      setError(null)
      const sankeyData = await apiService.getSankeyData(year)
      setData(sankeyData)
    } catch (error) {
      console.error('Error loading Sankey data:', error)
      setError('Erreur lors du chargement du diagramme')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  const formatPercentage = (value) => {
    const total = data?.total || 1
    const percentage = (value / total) * 100
    return `${percentage.toFixed(1)}%`
  }

  const formatValue = (value) => {
    return displayMode === 'currency' ? formatCurrency(value) : formatPercentage(value)
  }

  const CustomNode = ({ x, y, width, height, index, payload, containerWidth }) => {
    const isOut = x + width + 6 > containerWidth
    return (
      <g>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          fill={payload.color || '#8c70c7'}
          fillOpacity="1"
        />
        <text
          textAnchor={isOut ? 'end' : 'start'}
          x={isOut ? x - 6 : x + width + 6}
          y={y + height / 2 + 4}
          fontSize="12"
          fontWeight="500"
          fill="#374151"
        >
          {payload.name} <tspan fill="#6b7280" fontSize="11">({formatValue(payload.value)})</tspan>
        </text>
      </g>
    )
  }

  const CustomLink = ({ sourceX, targetX, sourceY, targetY, sourceControlX, targetControlX, linkWidth, payload }) => {
    return (
      <path
        d={`
          M${sourceX},${sourceY + linkWidth / 2}
          C${sourceControlX},${sourceY + linkWidth / 2} ${targetControlX},${targetY + linkWidth / 2} ${targetX},${targetY + linkWidth / 2}
          L${targetX},${targetY - linkWidth / 2}
          C${targetControlX},${targetY - linkWidth / 2} ${sourceControlX},${sourceY - linkWidth / 2} ${sourceX},${sourceY - linkWidth / 2}
          Z
        `}
        fill={payload.color || '#8c70c7'}
        fillOpacity="0.4"
        strokeWidth="0"
      />
    )
  }

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="sankey-tooltip">
          <p className="label">{`${data.source.name} → ${data.target.name}`}</p>
          <p className="value">{formatValue(data.value)}</p>
        </div>
      )
    }
    return null
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

  if (!data || !data.nodes || data.nodes.length === 0) {
    return (
      <div className="chart-empty">
        <p>Aucune donnée disponible pour {year}</p>
      </div>
    )
  }

  return (
    <div className="sankey-chart">
      <div className="sankey-header">
        <div className="sankey-summary">
          <p><strong>Total des dépenses :</strong> {formatCurrency(data.total || 0)}</p>
        </div>
        <div className="sankey-toggle">
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={displayMode === 'percentage'}
              onChange={(e) => setDisplayMode(e.target.checked ? 'percentage' : 'currency')}
            />
            <span className="toggle-slider">
              <span className="toggle-label toggle-label-left">€</span>
              <span className="toggle-label toggle-label-right">%</span>
            </span>
          </label>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={600}>
        <Sankey
          data={data}
          node={<CustomNode />}
          link={<CustomLink />}
          nodePadding={15}
          nodeWidth={15}
          margin={{ top: 20, right: 200, bottom: 20, left: 200 }}
          iterations={64}
        >
          <Tooltip content={<CustomTooltip />} />
        </Sankey>
      </ResponsiveContainer>
    </div>
  )
}

export default SankeyChart