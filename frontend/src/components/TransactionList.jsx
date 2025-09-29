import React, { useState } from 'react'
import TransactionRow from './TransactionRow'
import YearSelector from './Charts/YearSelector'
import { apiService } from '../services/api'

const TransactionList = ({ transactions, categories, subcategories, onUpdate, loading, availableYears, selectedYear, onYearChange, onLoadAllTransactions }) => {
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' })
  const [labelFilter, setLabelFilter] = useState('')
  const [useFuzzyMatching, setUseFuzzyMatching] = useState(false)
  const [showRuleModal, setShowRuleModal] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState('')
  const [showBulkCategorizeModal, setShowBulkCategorizeModal] = useState(false)
  const [bulkCategory, setBulkCategory] = useState('')
  const [bulkSubcategory, setBulkSubcategory] = useState('')
  const [showNewCategoryForm, setShowNewCategoryForm] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryColor, setNewCategoryColor] = useState('#667eea')
  const [showAllHistory, setShowAllHistory] = useState(false)
  const [showOnlyUncategorized, setShowOnlyUncategorized] = useState(false)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [showCategorizeModal, setShowCategorizeModal] = useState(false)
  const [transactionToCategorize, setTransactionToCategorize] = useState(null)
  const [selectedCategoryForSingle, setSelectedCategoryForSingle] = useState('')
  const [selectedSubcategoryForSingle, setSelectedSubcategoryForSingle] = useState('')

  // Cache for Levenshtein distance calculations
  const distanceCache = React.useRef(new Map())

  // Ref for filter input
  const filterInputRef = React.useRef(null)

  // Clear cache when filter changes
  React.useEffect(() => {
    distanceCache.current.clear()
  }, [labelFilter])

  // Handle show all history toggle
  React.useEffect(() => {
    if (onLoadAllTransactions) {
      onLoadAllTransactions(showAllHistory)
    }
  }, [showAllHistory, onLoadAllTransactions])

  // Keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger shortcuts if user is typing in an input field (except our filter input)
      if (e.target.tagName === 'INPUT' && e.target !== filterInputRef.current) return
      if (e.target.tagName === 'TEXTAREA') return
      if (e.target.tagName === 'SELECT') return

      switch (e.key) {
        case 'Escape':
          e.preventDefault()
          if (showShortcuts) {
            setShowShortcuts(false)
          } else if (labelFilter) {
            setLabelFilter('')
            filterInputRef.current?.blur()
          }
          break

        case '?':
          e.preventDefault()
          setShowShortcuts(true)
          break

        case '/':
          e.preventDefault()
          setLabelFilter('')
          filterInputRef.current?.focus()
          break

        default:
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [labelFilter, showShortcuts])

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

    // Filter by category (uncategorized only)
    if (showOnlyUncategorized) {
      filteredTransactions = filteredTransactions.filter(transaction => {
        return !transaction.category_id || transaction.category_name === 'Non catégorisé'
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
  }, [transactions, sortConfig, labelFilter, useFuzzyMatching, showOnlyUncategorized])

  const handleCategorize = (transaction) => {
    setTransactionToCategorize(transaction)
    setSelectedCategoryForSingle(transaction.category_id || '')
    setSelectedSubcategoryForSingle(transaction.subcategory_id || '')
    setShowCategorizeModal(true)
  }

  const handleSingleCategorizeSubmit = async () => {
    if (!transactionToCategorize) return

    try {
      await apiService.updateTransaction(transactionToCategorize.id, {
        category_id: selectedCategoryForSingle ? parseInt(selectedCategoryForSingle) : null,
        subcategory_id: selectedSubcategoryForSingle ? parseInt(selectedSubcategoryForSingle) : null
      })

      setShowCategorizeModal(false)
      setTransactionToCategorize(null)
      setSelectedCategoryForSingle('')
      setSelectedSubcategoryForSingle('')
      onUpdate() // Refresh transactions
    } catch (error) {
      console.error('Error categorizing transaction:', error)
      alert('Erreur lors de la catégorisation de la transaction')
    }
  }

  const getAvailableSubcategoriesForSingle = () => {
    if (!selectedCategoryForSingle) return []
    return subcategories.filter(sub => sub.category_id.toString() === selectedCategoryForSingle)
  }

  const handleSingleCategoryChange = (value) => {
    setSelectedCategoryForSingle(value)
    setSelectedSubcategoryForSingle('') // Reset subcategory when category changes
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

  const handleFilter = (label) => {
    setLabelFilter(label)
    // Auto-enable intelligent search for better filtering experience
    setUseFuzzyMatching(true)
  }

  const handleCreateRule = () => {
    if (!labelFilter.trim()) {
      alert('Aucun filtre actif pour créer une règle')
      return
    }
    setShowRuleModal(true)
  }

  const handleRuleSubmit = async () => {
    if (!selectedCategory) {
      alert('Veuillez sélectionner une catégorie')
      return
    }

    try {
      await apiService.createCategorizationRule({
        pattern: labelFilter.trim(),
        category_id: parseInt(selectedCategory),
        priority: 10 // Default priority
      })

      setShowRuleModal(false)
      setSelectedCategory('')
    } catch (error) {
      console.error('Error creating rule:', error)
      alert('Erreur lors de la création de la règle')
    }
  }

  const handleBulkCategorize = () => {
    if (filteredAndSortedTransactions.length === 0) {
      alert('Aucune transaction à catégoriser')
      return
    }
    setShowBulkCategorizeModal(true)
  }

  const handleCreateNewCategory = async () => {
    if (!newCategoryName.trim()) {
      alert('Veuillez saisir un nom de catégorie')
      return
    }

    try {
      const newCategory = await apiService.createCategory({
        name: newCategoryName.trim(),
        color: newCategoryColor
      })

      // Refresh categories and select the new one
      await onUpdate() // This should reload categories
      setBulkCategory(newCategory.id.toString())
      setShowNewCategoryForm(false)
      setNewCategoryName('')
      setNewCategoryColor('#667eea')
    } catch (error) {
      console.error('Error creating category:', error)
      alert('Erreur lors de la création de la catégorie')
    }
  }

  const handleBulkCategorizeSubmit = async () => {
    if (!bulkCategory) {
      alert('Veuillez sélectionner une catégorie')
      return
    }

    try {
      const promises = filteredAndSortedTransactions.map(transaction =>
        apiService.updateTransaction(transaction.id, {
          category_id: parseInt(bulkCategory),
          subcategory_id: bulkSubcategory ? parseInt(bulkSubcategory) : null
        })
      )

      await Promise.all(promises)

      setShowBulkCategorizeModal(false)
      setBulkCategory('')
      setBulkSubcategory('')
      onUpdate() // Refresh transactions
    } catch (error) {
      console.error('Error bulk categorizing:', error)
      alert('Erreur lors de la catégorisation en masse')
    }
  }

  const getAvailableSubcategoriesForBulk = () => {
    if (!bulkCategory) return []
    return subcategories.filter(sub => sub.category_id.toString() === bulkCategory)
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
              ref={filterInputRef}
              id="label-filter"
              type="text"
              value={labelFilter}
              onChange={(e) => setLabelFilter(e.target.value)}
              placeholder={useFuzzyMatching ? "Recherche intelligente (tolère les fautes de frappe)..." : "Rechercher dans les libellés..."}
              className="filter-input"
            />
            {labelFilter.trim() && (
              <>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => setLabelFilter('')}
                  title="Effacer le filtre"
                >
                  ✕
                </button>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleCreateRule}
                  title="Créer une règle de catégorisation automatique"
                >
                  ➕
                </button>
              </>
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
              <span>Recherche intelligente</span>
              <small className="checkbox-hint">
                Trouve "CARREFOUR" avec "carr", "carrefur", etc.
              </small>
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={showAllHistory}
                onChange={(e) => setShowAllHistory(e.target.checked)}
                className="filter-checkbox"
              />
              <span>Tout l'historique</span>
              <small className="checkbox-hint">
                Rechercher dans toutes les années
              </small>
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={showOnlyUncategorized}
                onChange={(e) => setShowOnlyUncategorized(e.target.checked)}
                className="filter-checkbox"
              />
              <span>Non catégorisées uniquement</span>
              <small className="checkbox-hint">
                Afficher seulement les transactions sans catégorie
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
            ref={filterInputRef}
            id="label-filter"
            type="text"
            value={labelFilter}
            onChange={(e) => setLabelFilter(e.target.value)}
            placeholder={useFuzzyMatching ? "Recherche intelligente (tolère les fautes de frappe)..." : "Rechercher dans les libellés..."}
            className="filter-input"
          />
          {labelFilter.trim() && (
            <>
              <button
                className="btn btn-outline btn-sm"
                onClick={() => setLabelFilter('')}
                title="Effacer le filtre"
              >
                ✕
              </button>
              <button
                className="btn btn-primary btn-sm create-rule-btn"
                onClick={handleCreateRule}
                title="Créer une règle de catégorisation automatique"
              >
                ➕
              </button>
              {filteredAndSortedTransactions.length > 0 && (
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={handleBulkCategorize}
                  title="Catégoriser toutes les transactions filtrées"
                >
                  🏷️ Batch ({filteredAndSortedTransactions.length})
                </button>
              )}
            </>
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
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={showAllHistory}
              onChange={(e) => setShowAllHistory(e.target.checked)}
              className="filter-checkbox"
            />
            <span>Tout l'historique</span>
            <small className="checkbox-hint">
              Rechercher dans toutes les années
            </small>
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={showOnlyUncategorized}
              onChange={(e) => setShowOnlyUncategorized(e.target.checked)}
              className="filter-checkbox"
            />
            <span>Non catégorisées uniquement</span>
            <small className="checkbox-hint">
              Afficher seulement les transactions sans catégorie
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
                onCategorize={() => handleCategorize(transaction)}
                onDelete={() => handleDelete(transaction.id)}
                onFilter={handleFilter}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Rule Creation Modal */}
      {showRuleModal && (
        <div className="modal-overlay" onClick={() => setShowRuleModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Créer une règle de catégorisation</h3>
            <p>
              Créer une règle pour catégoriser automatiquement les transactions contenant
              "<strong>{labelFilter}</strong>" lors des futurs imports.
            </p>

            <div className="form-group">
              <label htmlFor="rule-category">Catégorie :</label>
              <select
                id="rule-category"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="edit-select"
              >
                <option value="">Sélectionner une catégorie</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="modal-actions">
              <button
                className="btn btn-secondary"
                onClick={() => setShowRuleModal(false)}
              >
                Annuler
              </button>
              <button
                className="btn btn-primary"
                onClick={handleRuleSubmit}
                disabled={!selectedCategory}
              >
                Créer la règle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Categorization Modal */}
      {showBulkCategorizeModal && (
        <div className="modal-overlay" onClick={() => setShowBulkCategorizeModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Catégoriser en masse</h3>
            <p>
              Catégoriser <strong>{filteredAndSortedTransactions.length}</strong> transaction(s)
              {labelFilter && ` correspondant à "${labelFilter}"`}
            </p>

            <div className="form-group">
              <label htmlFor="bulk-category">Catégorie :</label>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <select
                  id="bulk-category"
                  value={bulkCategory}
                  onChange={(e) => {
                    setBulkCategory(e.target.value)
                    setBulkSubcategory('') // Reset subcategory when category changes
                  }}
                  className="edit-select"
                  style={{ flex: 1 }}
                >
                  <option value="">Sélectionner une catégorie</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => setShowNewCategoryForm(!showNewCategoryForm)}
                  title="Créer une nouvelle catégorie"
                >
                  ➕
                </button>
              </div>
            </div>

            {/* New Category Form */}
            {showNewCategoryForm && (
              <div className="form-group" style={{ background: '#f9fafb', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1rem' }}>
                <label htmlFor="new-category-name">Nouvelle catégorie :</label>
                <input
                  id="new-category-name"
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Nom de la catégorie"
                  className="edit-input"
                />
                <label htmlFor="new-category-color" style={{ marginTop: '0.5rem' }}>Couleur :</label>
                <input
                  id="new-category-color"
                  type="color"
                  value={newCategoryColor}
                  onChange={(e) => setNewCategoryColor(e.target.value)}
                  style={{ width: '3rem', height: '2rem', border: 'none', borderRadius: '0.25rem' }}
                />
                <div style={{ marginTop: '0.5rem' }}>
                  <button
                    className="btn btn-success btn-sm"
                    onClick={handleCreateNewCategory}
                    style={{ marginRight: '0.5rem' }}
                  >
                    Créer
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      setShowNewCategoryForm(false)
                      setNewCategoryName('')
                      setNewCategoryColor('#667eea')
                    }}
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="bulk-subcategory">Sous-catégorie (optionnel) :</label>
              <select
                id="bulk-subcategory"
                value={bulkSubcategory}
                onChange={(e) => setBulkSubcategory(e.target.value)}
                className="edit-select"
                disabled={!bulkCategory}
              >
                <option value="">Aucune sous-catégorie</option>
                {getAvailableSubcategoriesForBulk().map((subcategory) => (
                  <option key={subcategory.id} value={subcategory.id}>
                    {subcategory.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="modal-actions">
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setShowBulkCategorizeModal(false)
                  setBulkCategory('')
                  setBulkSubcategory('')
                  setShowNewCategoryForm(false)
                  setNewCategoryName('')
                  setNewCategoryColor('#667eea')
                }}
              >
                Annuler
              </button>
              <button
                className="btn btn-primary"
                onClick={handleBulkCategorizeSubmit}
                disabled={!bulkCategory}
              >
                Catégoriser ({filteredAndSortedTransactions.length})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shortcuts Modal */}
      {showShortcuts && (
        <div className="modal-overlay" onClick={() => setShowShortcuts(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Raccourcis clavier</h3>
            <div className="shortcuts-list">
              <div className="shortcut-item">
                <kbd>/</kbd>
                <span>Aller au champ de filtrage</span>
              </div>
              <div className="shortcut-item">
                <kbd>Escape</kbd>
                <span>Effacer le filtre courant / Fermer cette aide</span>
              </div>
              <div className="shortcut-item">
                <kbd>?</kbd>
                <span>Afficher cette aide</span>
              </div>
            </div>
            <div className="modal-actions">
              <button
                className="btn btn-secondary"
                onClick={() => setShowShortcuts(false)}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Single Transaction Categorization Modal */}
      {showCategorizeModal && transactionToCategorize && (
        <div className="modal-overlay" onClick={() => setShowCategorizeModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Catégoriser la transaction</h3>
            <div className="transaction-info">
              <p><strong>Libellé :</strong> {transactionToCategorize.label}</p>
              <p><strong>Montant :</strong> {transactionToCategorize.amount}€</p>
              <p><strong>Date :</strong> {new Date(transactionToCategorize.date).toLocaleDateString('fr-FR')}</p>
            </div>

            <div className="form-group">
              <label>Catégorie :</label>
              <select
                value={selectedCategoryForSingle}
                onChange={(e) => handleSingleCategoryChange(e.target.value)}
                className="form-select"
              >
                <option value="">Non catégorisé</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Sous-catégorie :</label>
              <select
                value={selectedSubcategoryForSingle}
                onChange={(e) => setSelectedSubcategoryForSingle(e.target.value)}
                className="form-select"
                disabled={!selectedCategoryForSingle}
              >
                <option value="">-</option>
                {getAvailableSubcategoriesForSingle().map((subcategory) => (
                  <option key={subcategory.id} value={subcategory.id}>
                    {subcategory.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="modal-actions">
              <button
                className="btn btn-secondary"
                onClick={() => setShowCategorizeModal(false)}
              >
                Annuler
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSingleCategorizeSubmit}
              >
                Catégoriser
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TransactionList
