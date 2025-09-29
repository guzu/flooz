import React, { useState } from 'react'
import TransactionRow from './TransactionRow'
import YearSelector from './Charts/YearSelector'
import { apiService } from '../services/api'

const TransactionList = ({ transactions, categories, subcategories, onUpdate, loading, availableYears, selectedYear, onYearChange }) => {
  const [editingId, setEditingId] = useState(null)
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' })
  const [labelFilter, setLabelFilter] = useState('')
  const [useFuzzyMatching, setUseFuzzyMatching] = useState(false)

  // Cache for Levenshtein distance calculations
  const distanceCache = React.useRef(new Map())

  // Clear cache when filter changes
  React.useEffect(() => {
    distanceCache.current.clear()
  }, [labelFilter])

  const handleSort = (key) => {
    let direction = 'asc'
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    setSortConfig({ key, direction })
  }

  // Optimized Levenshtein distance calculation with caching
  const calculateLevenshteinDistance = (str1, str2) => {
    const key = `${str1}|${str2}`
    if (distanceCache.current.has(key)) {
      return distanceCache.current.get(key)
    }

    const matrix = []
    const len1 = str1.length
    const len2 = str2.length

    // Early return for empty strings
    if (len1 === 0) {
      distanceCache.current.set(key, len2)
      return len2
    }
    if (len2 === 0) {
      distanceCache.current.set(key, len1)
      return len1
    }

    // Create matrix
    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i]
    }
    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j
    }

    // Fill matrix
    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,      // deletion
          matrix[i][j - 1] + 1,      // insertion
          matrix[i - 1][j - 1] + cost // substitution
        )
      }
    }

    const distance = matrix[len1][len2]
    distanceCache.current.set(key, distance)

    // Clear cache if it gets too large (keep memory usage reasonable)
    if (distanceCache.current.size > 1000) {
      distanceCache.current.clear()
    }

    return distance
  }

  // Hybrid intelligent matching function
  const intelligentMatch = (text, pattern) => {
    const textLower = text.toLowerCase()
    const patternLower = pattern.toLowerCase()

    // Priority 1: Exact match (case insensitive)
    if (textLower.includes(patternLower)) {
      return true
    }

    // Priority 2: Word start match
    const words = textLower.split(/\s+/)
    for (const word of words) {
      if (word.startsWith(patternLower)) {
        return true
      }
    }

    // Priority 3: Levenshtein distance with adaptive threshold
    const getThreshold = (length) => {
      if (length <= 4) return 1
      if (length <= 8) return 2
      return 3
    }

    const threshold = getThreshold(patternLower.length)

    // Check against full text
    if (calculateLevenshteinDistance(textLower, patternLower) <= threshold) {
      return true
    }

    // Check against individual words
    for (const word of words) {
      if (calculateLevenshteinDistance(word, patternLower) <= threshold) {
        return true
      }
    }

    return false
  }

  const filteredAndSortedTransactions = React.useMemo(() => {
    // First filter by label
    let filteredTransactions = [...transactions]
    if (labelFilter.trim()) {
      const filterText = labelFilter.trim()
      filteredTransactions = filteredTransactions.filter(transaction => {
        if (useFuzzyMatching) {
          return intelligentMatch(transaction.label, filterText)
        } else {
          return transaction.label.toLowerCase().includes(filterText.toLowerCase())
        }
      })
    }

    // Then sort
    if (sortConfig.key) {
      filteredTransactions.sort((a, b) => {
        let aValue = a[sortConfig.key]
        let bValue = b[sortConfig.key]

        if (sortConfig.key === 'date') {
          aValue = new Date(aValue)
          bValue = new Date(bValue)
        } else if (sortConfig.key === 'amount') {
          aValue = parseFloat(aValue)
          bValue = parseFloat(bValue)
        } else if (typeof aValue === 'string') {
          aValue = aValue.toLowerCase()
          bValue = bValue.toLowerCase()
        }

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1
        }
        return 0
      })
    }
    return filteredTransactions
  }, [transactions, sortConfig, labelFilter, useFuzzyMatching])

  const handleEdit = (id) => {
    setEditingId(id)
  }

  const handleSave = async (id, updatedData) => {
    try {
      await apiService.updateTransaction(id, updatedData)
      setEditingId(null)
      onUpdate()
    } catch (error) {
      console.error('Error updating transaction:', error)
      alert('Erreur lors de la mise à jour de la transaction')
    }
  }

  const handleCancel = () => {
    setEditingId(null)
  }

  const handleDelete = async (id) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette transaction ?')) {
      try {
        await apiService.deleteTransaction(id)
        onUpdate()
      } catch (error) {
        console.error('Error deleting transaction:', error)
        alert('Erreur lors de la suppression de la transaction')
      }
    }
  }

  const getSortIcon = (columnKey) => {
    if (sortConfig.key !== columnKey) {
      return '↕️'
    }
    return sortConfig.direction === 'asc' ? '↑' : '↓'
  }

  if (loading) {
    return (
      <div className="loading">
        <p>Chargement des transactions...</p>
      </div>
    )
  }

  if (transactions.length === 0) {
    return (
      <div className="empty-state">
        <p>Aucune transaction trouvée pour cette période.</p>
        <p>Importez un fichier CSV pour commencer !</p>
      </div>
    )
  }

  if (filteredAndSortedTransactions.length === 0 && labelFilter.trim()) {
    return (
      <div className="transaction-list">
        <div className="transaction-summary">
          <div className="summary-left">
            <p>
              <strong>{transactions.length}</strong> transaction(s) au total
            </p>
          </div>
          <div className="summary-right">
            {availableYears && selectedYear && onYearChange && (
              <YearSelector
                years={availableYears}
                selectedYear={selectedYear}
                onYearChange={onYearChange}
              />
            )}
          </div>
        </div>

        <div className="filter-section">
          <div className="filter-group">
            <label htmlFor="label-filter">Filtrer par libellé :</label>
            <input
              id="label-filter"
              type="text"
              value={labelFilter}
              onChange={(e) => setLabelFilter(e.target.value)}
              placeholder={useFuzzyMatching ? "Recherche intelligente (tolère les fautes de frappe)..." : "Rechercher dans les libellés..."}
              className="filter-input"
            />
          </div>
          <div className="filter-options">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={useFuzzyMatching}
                onChange={(e) => setUseFuzzyMatching(e.target.checked)}
                className="filter-checkbox"
              />
              <span>Recherche intelligente</span>
              <small className="checkbox-hint">
                Trouve "CARREFOUR" avec "carr", "carrefur", etc.
              </small>
            </label>
          </div>
        </div>

        <div className="empty-state">
          <p>Aucune transaction ne correspond au filtre "<strong>{labelFilter}</strong>".</p>
          <button
            className="btn btn-outline btn-sm"
            onClick={() => setLabelFilter('')}
          >
            Effacer le filtre
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="transaction-list">
      <div className="transaction-summary">
        <div className="summary-left">
          <p>
            <strong>{filteredAndSortedTransactions.length}</strong> transaction(s) affichée(s)
            {labelFilter.trim() && (
              <span> sur <strong>{transactions.length}</strong> au total</span>
            )}
          </p>
        </div>
        <div className="summary-right">
          {availableYears && selectedYear && onYearChange && (
            <YearSelector
              years={availableYears}
              selectedYear={selectedYear}
              onYearChange={onYearChange}
            />
          )}
        </div>
      </div>

      <div className="filter-section">
        <div className="filter-group">
          <label htmlFor="label-filter">Filtrer par libellé :</label>
          <input
            id="label-filter"
            type="text"
            value={labelFilter}
            onChange={(e) => setLabelFilter(e.target.value)}
            placeholder={useFuzzyMatching ? "Recherche intelligente (tolère les fautes de frappe)..." : "Rechercher dans les libellés..."}
            className="filter-input"
          />
          {labelFilter.trim() && (
            <button
              className="btn btn-outline btn-sm"
              onClick={() => setLabelFilter('')}
              title="Effacer le filtre"
            >
              ✕
            </button>
          )}
        </div>
        <div className="filter-options">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={useFuzzyMatching}
              onChange={(e) => setUseFuzzyMatching(e.target.checked)}
              className="filter-checkbox"
            />
            <span>Recherche floue</span>
            <small className="checkbox-hint">
              Permet de trouver "CARREFOUR" en tapant "crfr"
            </small>
          </label>
        </div>
      </div>

      <div className="table-container">
        <table className="transactions-table">
          <thead>
            <tr>
              <th
                onClick={() => handleSort('date')}
                className="sortable date-col"
              >
                Date {getSortIcon('date')}
              </th>
              <th
                onClick={() => handleSort('label')}
                className="sortable label-col"
              >
                Libellé {getSortIcon('label')}
              </th>
              <th
                onClick={() => handleSort('amount')}
                className="sortable amount-col"
              >
                Montant {getSortIcon('amount')}
              </th>
              <th
                onClick={() => handleSort('category_name')}
                className="sortable category-col"
              >
                Catégorie {getSortIcon('category_name')}
              </th>
              <th
                onClick={() => handleSort('subcategory_name')}
                className="sortable subcategory-col"
              >
                Sous-catégorie {getSortIcon('subcategory_name')}
              </th>
              <th className="actions-col"
	  	>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedTransactions.map((transaction) => (
              <TransactionRow
                key={transaction.id}
                transaction={transaction}
                categories={categories}
                subcategories={subcategories}
                isEditing={editingId === transaction.id}
                onEdit={() => handleEdit(transaction.id)}
                onSave={(data) => handleSave(transaction.id, data)}
                onCancel={handleCancel}
                onDelete={() => handleDelete(transaction.id)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default TransactionList
