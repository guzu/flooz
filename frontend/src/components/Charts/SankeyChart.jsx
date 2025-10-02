import React, { useState, useEffect, useRef } from 'react'
import { sankey, sankeyLinkHorizontal } from 'd3-sankey'
import { apiService } from '../../services/api'

const SankeyChart = ({ year }) => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [displayMode, setDisplayMode] = useState('currency')
  const svgRef = useRef(null)

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

  useEffect(() => {
    if (!data || !data.nodes || data.nodes.length === 0 || !svgRef.current) return

    const svg = svgRef.current
    const width = 1200
    const height = 600

    svg.innerHTML = ''

    // Create sankey generator
    const sankeyGenerator = sankey()
      .nodeWidth(20)
      .nodePadding(15)
      .extent([[200, 20], [width - 200, height - 20]])
      .nodeSort(null) // Preserve order from backend

    // Apply layout
    const { nodes, links } = sankeyGenerator({
      nodes: data.nodes.map(d => Object.assign({}, d)),
      links: data.links.map(d => Object.assign({}, d))
    })

    // Draw links
    const linkGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    links.forEach(link => {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
      path.setAttribute('d', sankeyLinkHorizontal()(link))
      path.setAttribute('stroke', link.color || '#8c70c7')
      path.setAttribute('stroke-opacity', '0.3')
      path.setAttribute('fill', 'none')
      path.setAttribute('stroke-width', Math.max(1, link.width))

      const title = document.createElementNS('http://www.w3.org/2000/svg', 'title')
      title.textContent = `${link.source.name} → ${link.target.name}: ${formatValue(link.value)}`
      path.appendChild(title)

      linkGroup.appendChild(path)
    })
    svg.appendChild(linkGroup)

    // Draw nodes
    const nodeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    nodes.forEach(node => {
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
      rect.setAttribute('x', node.x0)
      rect.setAttribute('y', node.y0)
      rect.setAttribute('width', node.x1 - node.x0)
      rect.setAttribute('height', node.y1 - node.y0)
      rect.setAttribute('fill', node.color || '#8c70c7')
      rect.setAttribute('rx', '3')
      nodeGroup.appendChild(rect)

      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')
      // Place text on the left for first column, right for last column
      const isLastColumn = node.x0 > width * 0.6
      text.setAttribute('x', isLastColumn ? node.x1 + 6 : node.x0 - 6)
      text.setAttribute('y', (node.y0 + node.y1) / 2)
      text.setAttribute('dy', '0.35em')
      text.setAttribute('text-anchor', isLastColumn ? 'start' : 'end')
      text.setAttribute('font-size', '12')
      text.setAttribute('fill', '#374151')
      text.textContent = `${node.name} (${formatValue(node.value)})`

      nodeGroup.appendChild(text)
    })
    svg.appendChild(nodeGroup)

  }, [data, displayMode])

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
      <svg
        ref={svgRef}
        width="100%"
        height="600"
        viewBox="0 0 1200 600"
        style={{ maxWidth: '100%' }}
      />
    </div>
  )
}

export default SankeyChart
