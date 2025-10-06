import React, { useState } from 'react'
import TransactionRow from './TransactionRow'
import BalanceCheckpointRow from './BalanceCheckpointRow'
import YearSelector from './Charts/YearSelector'
import { apiService } from '../services/api'

const TransactionList = ({ transactions, categories, subcategories, onUpdate, loading, availableYears, selectedYear, onYearChange, onLoadAllTransactions }) => {
  const [sortConfig, setSortConfig] = useState(() => {
    const saved = localStorage.getItem('flooz_sort_config')
    return saved ? JSON.parse(saved) : { key: 'date', direction: 'desc' }
  })
  const [labelFilter, setLabelFilter] = useState('')
  const [useFuzzyMatching, setUseFuzzyMatching] = useState(false)
  const [checkpoints, setCheckpoints] = useState([])
  const [allTransactions, setAllTransactions] = useState([])
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
  const [selectedTransactions, setSelectedTransactions] = useState(new Set())
  const [lastSelectedIndex, setLastSelectedIndex] = useState(null)
  const [showColumnSelector, setShowColumnSelector] = useState(false)
  const [visibleColumns, setVisibleColumns] = useState(() => {
    const saved = localStorage.getItem('flooz_visible_columns')
    return saved ? JSON.parse(saved) : {
      date: true,           // obligatoire
      operation_date: true,
      label: true,          // obligatoire
      notes: true,
      amount: true,         // obligatoire
      category: true,
      subcategory: true
    }
  })
  const [showAddTransactionModal, setShowAddTransactionModal] = useState(false)
  const [newTransaction, setNewTransaction] = useState({
    date: new Date().toISOString().split('T')[0],
    operation_date: new Date().toISOString().split('T')[0],
    label: '',
    amount: '',
    is_credit: false,
    category_id: '',
    subcategory_id: '',
    notes: ''
  })
  const [showCheckpointModal, setShowCheckpointModal] = useState(false)
  const [checkpointToEdit, setCheckpointToEdit] = useState(null)
  const [newCheckpoint, setNewCheckpoint] = useState({
    date: new Date().toISOString().split('T')[0],
    balance: '',
    notes: ''
  })

  // Cache for Levenshtein distance calculations
  const distanceCache = React.useRef(new Map())

  // Save column preferences to localStorage
  React.useEffect(() => {
    localStorage.setItem('flooz_visible_columns', JSON.stringify(visibleColumns))
  }, [visibleColumns])

  // Save sort configuration to localStorage
  React.useEffect(() => {
    localStorage.setItem('flooz_sort_config', JSON.stringify(sortConfig))
  }, [sortConfig])

  // Ref for filter input
  const filterInputRef = React.useRef(null)

  // Clear cache and selection when filter changes
  React.useEffect(() => {
    distanceCache.current.clear()
    setSelectedTransactions(new Set())
    setLastSelectedIndex(null)
  }, [labelFilter, showOnlyUncategorized, showAllHistory])

  // Handle show all history toggle
  React.useEffect(() => {
    if (onLoadAllTransactions) {
      onLoadAllTransactions(showAllHistory)
    }
  }, [showAllHistory, onLoadAllTransactions])

  // Load checkpoints and all transactions for balance calculation
  React.useEffect(() => {
    const loadData = async () => {
      try {
        const [checkpointsData, allTransactionsData] = await Promise.all([
          apiService.getCheckpoints(),
          apiService.getTransactions(null) // Load ALL transactions (no year filter)
        ])
        setCheckpoints(checkpointsData)
        setAllTransactions(allTransactionsData)
      } catch (error) {
        console.error('Failed to load checkpoints or transactions:', error)
      }
    }
    loadData()
  }, [])

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

        case 'a':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            // Select all visible transactions
            setSelectedTransactions(new Set(filteredAndSortedTransactions.map(t => t.id)))
          }
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

  // Calculate checkpoint balances using ALL transactions (ignoring filters)
  const checkpointBalances = React.useMemo(() => {
    if (checkpoints.length === 0 || allTransactions.length === 0) {
      console.log('⚠️ Checkpoint calculation skipped:', { checkpointsCount: checkpoints.length, allTransactionsCount: allTransactions.length })
      return new Map()
    }

    console.log('🔢 Calculating checkpoint balances with:', allTransactions.length, 'transactions')

    // Sort ALL transactions chronologically (oldest first)
    const chronological = [...allTransactions].sort((a, b) => new Date(a.date) - new Date(b.date))

    // Sort checkpoints chronologically
    const sortedCheckpoints = [...checkpoints].sort((a, b) => new Date(a.date) - new Date(b.date))

    const balances = new Map()
    let checkpointIndex = 0
    let runningBalance = 0
    let isFirstCheckpoint = true

    for (const transaction of chronological) {
      const transDate = new Date(transaction.date)

      // Process checkpoints that come strictly before this transaction date
      // Checkpoints represent the balance at END of day, so process them after transactions of that day
      while (checkpointIndex < sortedCheckpoints.length &&
             new Date(sortedCheckpoints[checkpointIndex].date) < transDate) {
        const checkpoint = sortedCheckpoints[checkpointIndex]

        console.log(`📊 Checkpoint ${checkpoint.date} (in loop):`, {
          calculatedBalance: isFirstCheckpoint ? null : runningBalance,
          referenceBalance: checkpoint.balance,
          isFirst: isFirstCheckpoint,
          transactionDate: transaction.date
        })

        // Store calculated balance (null for first checkpoint as it's the reference)
        balances.set(checkpoint.id, {
          calculatedBalance: isFirstCheckpoint ? null : runningBalance,
          isFirstCheckpoint: isFirstCheckpoint
        })

        // Reset running balance to checkpoint balance
        runningBalance = parseFloat(checkpoint.balance)
        checkpointIndex++
        isFirstCheckpoint = false
      }

      // Subtract transaction amount from running balance
      // Convention: positive amount = debit (expense), negative amount = credit (income)
      runningBalance -= parseFloat(transaction.amount)
    }

    // Process remaining checkpoints
    while (checkpointIndex < sortedCheckpoints.length) {
      const checkpoint = sortedCheckpoints[checkpointIndex]
      console.log(`📊 Checkpoint ${checkpoint.date} (remaining):`, {
        calculatedBalance: isFirstCheckpoint ? null : runningBalance,
        referenceBalance: checkpoint.balance,
        isFirst: isFirstCheckpoint
      })
      balances.set(checkpoint.id, {
        calculatedBalance: isFirstCheckpoint ? null : runningBalance,
        isFirstCheckpoint: isFirstCheckpoint
      })
      runningBalance = parseFloat(checkpoint.balance)
      checkpointIndex++
      isFirstCheckpoint = false
    }

    console.log('✅ Checkpoint balances calculated:', balances)
    return balances
  }, [allTransactions, checkpoints])

  // Merge filtered transactions and checkpoints for display
  const mergedItems = React.useMemo(() => {
    // Filter checkpoints by year (if year filter is active)
    let filteredCheckpoints = [...checkpoints]
    if (selectedYear && !showAllHistory) {
      filteredCheckpoints = filteredCheckpoints.filter(checkpoint => {
        const checkpointYear = new Date(checkpoint.date).getFullYear()
        return checkpointYear === selectedYear
      })
    }

    // Only merge checkpoints if sorting by date
    if (sortConfig.key === 'date') {
      // Sort filtered transactions chronologically for merging
      const chronological = [...filteredAndSortedTransactions].sort((a, b) => new Date(a.date) - new Date(b.date))

      // Sort checkpoints chronologically
      const sortedCheckpoints = filteredCheckpoints.sort((a, b) => new Date(a.date) - new Date(b.date))

      const items = []
      let checkpointIndex = 0

      for (const transaction of chronological) {
        const transDate = new Date(transaction.date)

        // Insert checkpoints that come strictly before this transaction date
        while (checkpointIndex < sortedCheckpoints.length &&
               new Date(sortedCheckpoints[checkpointIndex].date) < transDate) {
          const checkpoint = sortedCheckpoints[checkpointIndex]
          const balanceInfo = checkpointBalances.get(checkpoint.id) || { calculatedBalance: null, isFirstCheckpoint: false }

          items.push({
            type: 'checkpoint',
            checkpoint: checkpoint,
            calculatedBalance: balanceInfo.calculatedBalance,
            date: checkpoint.date,
            isFirstCheckpoint: balanceInfo.isFirstCheckpoint
          })
          checkpointIndex++
        }

        // Add transaction
        items.push({
          type: 'transaction',
          transaction: transaction,
          date: transaction.date
        })
      }

      // Add remaining checkpoints
      while (checkpointIndex < sortedCheckpoints.length) {
        const checkpoint = sortedCheckpoints[checkpointIndex]
        const balanceInfo = checkpointBalances.get(checkpoint.id) || { calculatedBalance: null, isFirstCheckpoint: false }

        items.push({
          type: 'checkpoint',
          checkpoint: checkpoint,
          calculatedBalance: balanceInfo.calculatedBalance,
          date: checkpoint.date,
          isFirstCheckpoint: balanceInfo.isFirstCheckpoint
        })
        checkpointIndex++
      }

      // Apply sort direction
      items.sort((a, b) => {
        const dateCompare = new Date(a.date) - new Date(b.date)
        return sortConfig.direction === 'asc' ? dateCompare : -dateCompare
      })

      return items
    } else {
      // For non-date sorting, just return transactions (no checkpoint merging)
      return filteredAndSortedTransactions.map(transaction => ({
        type: 'transaction',
        transaction: transaction,
        date: transaction.date
      }))
    }
  }, [filteredAndSortedTransactions, checkpoints, checkpointBalances, sortConfig, selectedYear, showAllHistory])

  // Calculate sum of selected transactions
  const selectedSum = React.useMemo(() => {
    if (selectedTransactions.size === 0) return 0
    return filteredAndSortedTransactions
      .filter(t => selectedTransactions.has(t.id))
      .reduce((sum, t) => sum + parseFloat(t.amount), 0)
  }, [selectedTransactions, filteredAndSortedTransactions])

  const handleCategorize = (transaction = null) => {
    if (selectedTransactions.size > 1) {
      // Multiple transactions selected - use bulk categorization
      setShowBulkCategorizeModal(true)
    } else if (selectedTransactions.size === 1) {
      // Single transaction selected from multi-selection
      const selectedId = Array.from(selectedTransactions)[0]
      const selectedTransaction = filteredAndSortedTransactions.find(t => t.id === selectedId)
      setTransactionToCategorize(selectedTransaction)
      setSelectedCategoryForSingle(selectedTransaction.category_id || '')
      setSelectedSubcategoryForSingle(selectedTransaction.subcategory_id || '')
      setShowCategorizeModal(true)
    } else if (transaction) {
      // Single transaction from button click
      setTransactionToCategorize(transaction)
      setSelectedCategoryForSingle(transaction.category_id || '')
      setSelectedSubcategoryForSingle(transaction.subcategory_id || '')
      setShowCategorizeModal(true)
    }
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

  const handleTransactionSelection = (transaction, index, event) => {
    const transactionId = transaction.id

    if (event.ctrlKey || event.metaKey) {
      // Ctrl/Cmd + click: toggle selection
      setSelectedTransactions(prev => {
        const newSet = new Set(prev)
        if (newSet.has(transactionId)) {
          newSet.delete(transactionId)
        } else {
          newSet.add(transactionId)
        }
        return newSet
      })
      setLastSelectedIndex(index)
    } else if (event.shiftKey && lastSelectedIndex !== null) {
      // Shift + click: select range
      const startIndex = Math.min(lastSelectedIndex, index)
      const endIndex = Math.max(lastSelectedIndex, index)

      setSelectedTransactions(prev => {
        const newSet = new Set(prev)
        for (let i = startIndex; i <= endIndex; i++) {
          if (filteredAndSortedTransactions[i]) {
            newSet.add(filteredAndSortedTransactions[i].id)
          }
        }
        return newSet
      })
    } else {
      // Normal click: select only this transaction
      setSelectedTransactions(new Set([transactionId]))
      setLastSelectedIndex(index)
    }
  }

  const clearSelection = () => {
    setSelectedTransactions(new Set())
    setLastSelectedIndex(null)
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
    if (selectedTransactions.size > 0) {
      setShowBulkCategorizeModal(true)
    } else if (filteredAndSortedTransactions.length === 0) {
      alert('Aucune transaction à catégoriser')
      return
    } else {
      setShowBulkCategorizeModal(true)
    }
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
      // Use selected transactions if any, otherwise use filtered transactions
      const transactionsToUpdate = selectedTransactions.size > 0
        ? filteredAndSortedTransactions.filter(t => selectedTransactions.has(t.id))
        : filteredAndSortedTransactions

      const promises = transactionsToUpdate.map(transaction =>
        apiService.updateTransaction(transaction.id, {
          category_id: parseInt(bulkCategory),
          subcategory_id: bulkSubcategory ? parseInt(bulkSubcategory) : null
        })
      )

      await Promise.all(promises)

      setShowBulkCategorizeModal(false)
      setBulkCategory('')
      setBulkSubcategory('')
      clearSelection() // Clear selection after bulk operation
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

  const handleAddTransaction = async () => {
    if (!newTransaction.label.trim() || !newTransaction.amount) {
      alert('Veuillez remplir au minimum le libellé et le montant')
      return
    }

    try {
      // Calculate the final amount (credit = negative, debit = positive)
      const finalAmount = newTransaction.is_credit
        ? -Math.abs(parseFloat(newTransaction.amount))
        : Math.abs(parseFloat(newTransaction.amount))

      await apiService.createTransaction({
        date: newTransaction.date,
        operation_date: newTransaction.operation_date || newTransaction.date,
        label: newTransaction.label.trim(),
        amount: finalAmount,
        category_id: newTransaction.category_id ? parseInt(newTransaction.category_id) : null,
        subcategory_id: newTransaction.subcategory_id ? parseInt(newTransaction.subcategory_id) : null,
        notes: newTransaction.notes.trim() || null
      })

      // Reset form
      setNewTransaction({
        date: new Date().toISOString().split('T')[0],
        operation_date: new Date().toISOString().split('T')[0],
        label: '',
        amount: '',
        is_credit: false,
        category_id: '',
        subcategory_id: '',
        notes: ''
      })
      setShowAddTransactionModal(false)
      onUpdate() // Refresh transactions
    } catch (error) {
      console.error('Error creating transaction:', error)
      alert('Erreur lors de la création de la transaction')
    }
  }

  const getAvailableSubcategoriesForAdd = () => {
    if (!newTransaction.category_id) return []
    return subcategories.filter(sub => sub.category_id.toString() === newTransaction.category_id)
  }

  // Checkpoint handlers
  const handleAddCheckpoint = () => {
    setCheckpointToEdit(null)
    setNewCheckpoint({
      date: new Date().toISOString().split('T')[0],
      balance: '',
      notes: ''
    })
    setShowCheckpointModal(true)
  }

  const handleEditCheckpoint = (checkpoint) => {
    setCheckpointToEdit(checkpoint)
    setNewCheckpoint({
      date: checkpoint.date,
      balance: checkpoint.balance.toString(),
      notes: checkpoint.notes || ''
    })
    setShowCheckpointModal(true)
  }

  const handleDeleteCheckpoint = async (id) => {
    try {
      await apiService.deleteCheckpoint(id)
      const [checkpointsData, allTransactionsData] = await Promise.all([
        apiService.getCheckpoints(),
        apiService.getTransactions(null)
      ])
      setCheckpoints(checkpointsData)
      setAllTransactions(allTransactionsData)
    } catch (error) {
      console.error('Error deleting checkpoint:', error)
      alert('Erreur lors de la suppression du point de contrôle')
    }
  }

  const handleSaveCheckpoint = async () => {
    if (!newCheckpoint.date || !newCheckpoint.balance) {
      alert('Veuillez remplir tous les champs requis')
      return
    }

    try {
      if (checkpointToEdit) {
        // Update existing checkpoint
        await apiService.updateCheckpoint(checkpointToEdit.id, {
          date: newCheckpoint.date,
          balance: parseFloat(newCheckpoint.balance),
          notes: newCheckpoint.notes.trim() || null
        })
      } else {
        // Create new checkpoint
        await apiService.createCheckpoint({
          date: newCheckpoint.date,
          balance: parseFloat(newCheckpoint.balance),
          notes: newCheckpoint.notes.trim() || null
        })
      }

      // Reload checkpoints and all transactions
      const [checkpointsData, allTransactionsData] = await Promise.all([
        apiService.getCheckpoints(),
        apiService.getTransactions(null)
      ])
      setCheckpoints(checkpointsData)
      setAllTransactions(allTransactionsData)

      // Reset form
      setNewCheckpoint({
        date: new Date().toISOString().split('T')[0],
        balance: '',
        notes: ''
      })
      setShowCheckpointModal(false)
      setCheckpointToEdit(null)
    } catch (error) {
      console.error('Error saving checkpoint:', error)
      alert('Erreur lors de la sauvegarde du point de contrôle')
    }
  }

  const getSortIcon = (columnKey) => {
    if (sortConfig.key !== columnKey) {
      return '⇵'
    }
    return sortConfig.direction === 'asc' ? '▲' : '▼'
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

        <div className="filter-section-wrapper">
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
          <div className="add-transaction-wrapper">
            <button
              className="btn btn-success btn-sm add-transaction-btn"
              onClick={() => setShowAddTransactionModal(true)}
              title="Ajouter une transaction manuellement"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </button>
            <button
              className="btn btn-info btn-sm add-checkpoint-btn"
              onClick={handleAddCheckpoint}
              title="Ajouter un point de contrôle bancaire"
            >
              📊
            </button>
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
            {selectedTransactions.size > 0 && (
              <span> | <strong>{selectedTransactions.size}</strong> sélectionnée(s)
                {' '}(<strong style={{ color: selectedSum <= 0 ? '#10b981' : '#ef4444' }}>
                  {(-selectedSum).toFixed(2)} €
                </strong>)
              </span>
            )}
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

      <div className="filter-section-wrapper">
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
                    🏷️ Batch ({selectedTransactions.size > 0 ? selectedTransactions.size : filteredAndSortedTransactions.length})
                  </button>
                )}
                {selectedTransactions.size > 0 && (
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={clearSelection}
                    title="Désélectionner toutes les transactions"
                  >
                    Désélectionner ({selectedTransactions.size})
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
        <div className="add-transaction-wrapper">
          <button
            className="btn btn-success btn-sm add-transaction-btn"
            onClick={() => setShowAddTransactionModal(true)}
            title="Ajouter une transaction manuellement"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>
          <button
            className="btn btn-info btn-sm add-checkpoint-btn"
            onClick={handleAddCheckpoint}
            title="Ajouter un point de contrôle bancaire"
          >
            ✓
          </button>
        </div>
      </div>

      <div className="table-container">
        <table className="transactions-table">
          <thead>
            <tr>
              {visibleColumns.date && (
                <th
                  onClick={() => handleSort('date')}
                  className="sortable date-col"
                >
                  Date valeur {getSortIcon('date')}
                </th>
              )}
              {visibleColumns.operation_date && (
                <th
                  onClick={() => handleSort('operation_date')}
                  className="sortable operation-date-col"
                >
                  Date op. {getSortIcon('operation_date')}
                </th>
              )}
              {visibleColumns.label && (
                <th
                  onClick={() => handleSort('label')}
                  className="sortable label-col"
                >
                  Libellé {getSortIcon('label')}
                </th>
              )}
              {visibleColumns.notes && (
                <th className="notes-col">
                  Notes
                </th>
              )}
              {visibleColumns.amount && (
                <th
                  onClick={() => handleSort('amount')}
                  className="sortable amount-col"
                >
                  Montant {getSortIcon('amount')}
                </th>
              )}
              {visibleColumns.category && (
                <th
                  onClick={() => handleSort('category_name')}
                  className="sortable category-col"
                >
                  Catégorie {getSortIcon('category_name')}
                </th>
              )}
              {visibleColumns.subcategory && (
                <th
                  onClick={() => handleSort('subcategory_name')}
                  className="sortable subcategory-col"
                >
                  Sous-catégorie {getSortIcon('subcategory_name')}
                </th>
              )}
              <th className="actions-col">
                Actions
                <button
                  className="column-selector-btn"
                  onClick={() => setShowColumnSelector(!showColumnSelector)}
                  title="Sélectionner les colonnes à afficher"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                    <line x1="9" y1="3" x2="9" y2="21"/>
                    <line x1="15" y1="3" x2="15" y2="21"/>
                  </svg>
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {mergedItems.map((item, index) => {
              if (item.type === 'checkpoint') {
                return (
                  <BalanceCheckpointRow
                    key={`checkpoint-${item.checkpoint.id}`}
                    checkpoint={item.checkpoint}
                    calculatedBalance={item.calculatedBalance}
                    onDelete={handleDeleteCheckpoint}
                    onEdit={handleEditCheckpoint}
                    visibleColumns={visibleColumns}
                  />
                )
              } else {
                return (
                  <TransactionRow
                    key={`transaction-${item.transaction.id}`}
                    transaction={item.transaction}
                    categories={categories}
                    subcategories={subcategories}
                    onCategorize={() => handleCategorize(item.transaction)}
                    onDelete={() => handleDelete(item.transaction.id)}
                    onFilter={handleFilter}
                    onUpdate={onUpdate}
                    isSelected={selectedTransactions.has(item.transaction.id)}
                    onSelect={handleTransactionSelection}
                    index={index}
                    hasMultipleSelected={selectedTransactions.size > 1}
                    visibleColumns={visibleColumns}
                  />
                )
              }
            })}
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
              Catégoriser <strong>
                {selectedTransactions.size > 0
                  ? selectedTransactions.size
                  : filteredAndSortedTransactions.length}
              </strong> transaction(s)
              {selectedTransactions.size > 0
                ? ' sélectionnée(s)'
                : labelFilter && ` correspondant à "${labelFilter}"`}
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
                Catégoriser ({selectedTransactions.size > 0 ? selectedTransactions.size : filteredAndSortedTransactions.length})
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
              <div className="shortcut-item">
                <kbd>Ctrl+A</kbd>
                <span>Sélectionner toutes les transactions visibles</span>
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

      {/* Column Selector Modal */}
      {showColumnSelector && (
        <div className="modal-overlay" onClick={() => setShowColumnSelector(false)}>
          <div className="modal column-selector-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Colonnes affichées</h3>
            <div className="column-selector-list">
              <label className={`column-selector-item ${!visibleColumns.date ? 'disabled' : ''}`}>
                <input
                  type="checkbox"
                  checked={visibleColumns.date}
                  disabled={true}
                  readOnly
                />
                <span>Date valeur</span>
                <small className="required-badge">Obligatoire</small>
              </label>

              <label className="column-selector-item">
                <input
                  type="checkbox"
                  checked={visibleColumns.operation_date}
                  onChange={(e) => setVisibleColumns({...visibleColumns, operation_date: e.target.checked})}
                />
                <span>Date opération</span>
              </label>

              <label className={`column-selector-item ${!visibleColumns.label ? 'disabled' : ''}`}>
                <input
                  type="checkbox"
                  checked={visibleColumns.label}
                  disabled={true}
                  readOnly
                />
                <span>Libellé</span>
                <small className="required-badge">Obligatoire</small>
              </label>

              <label className="column-selector-item">
                <input
                  type="checkbox"
                  checked={visibleColumns.notes}
                  onChange={(e) => setVisibleColumns({...visibleColumns, notes: e.target.checked})}
                />
                <span>Notes</span>
              </label>

              <label className={`column-selector-item ${!visibleColumns.amount ? 'disabled' : ''}`}>
                <input
                  type="checkbox"
                  checked={visibleColumns.amount}
                  disabled={true}
                  readOnly
                />
                <span>Montant</span>
                <small className="required-badge">Obligatoire</small>
              </label>

              <label className="column-selector-item">
                <input
                  type="checkbox"
                  checked={visibleColumns.category}
                  onChange={(e) => setVisibleColumns({...visibleColumns, category: e.target.checked})}
                />
                <span>Catégorie</span>
              </label>

              <label className="column-selector-item">
                <input
                  type="checkbox"
                  checked={visibleColumns.subcategory}
                  onChange={(e) => setVisibleColumns({...visibleColumns, subcategory: e.target.checked})}
                />
                <span>Sous-catégorie</span>
              </label>
            </div>
            <div className="modal-actions">
              <button
                className="btn btn-secondary"
                onClick={() => setShowColumnSelector(false)}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Transaction Modal */}
      {showAddTransactionModal && (
        <div className="modal-overlay" onClick={() => setShowAddTransactionModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Ajouter une transaction</h3>

            <div className="form-group">
              <label htmlFor="new-date">Date de valeur :</label>
              <input
                id="new-date"
                type="date"
                value={newTransaction.date}
                onChange={(e) => setNewTransaction({...newTransaction, date: e.target.value})}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="new-operation-date">Date d'opération :</label>
              <input
                id="new-operation-date"
                type="date"
                value={newTransaction.operation_date}
                onChange={(e) => setNewTransaction({...newTransaction, operation_date: e.target.value})}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="new-label">Libellé * :</label>
              <input
                id="new-label"
                type="text"
                value={newTransaction.label}
                onChange={(e) => setNewTransaction({...newTransaction, label: e.target.value})}
                className="form-input"
                placeholder="Description de la transaction"
              />
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                <label htmlFor="new-amount">Montant * :</label>
                <label className="checkbox-label" style={{ whiteSpace: 'nowrap', gap: '0.25rem' }}>
                  <input
                    type="checkbox"
                    checked={newTransaction.is_credit}
                    onChange={(e) => setNewTransaction({...newTransaction, is_credit: e.target.checked})}
                  />
                  <span>Crédit</span>
                </label>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: newTransaction.is_credit ? '#10b981' : '#ef4444', minWidth: '1.5rem', textAlign: 'center' }}>
                  {newTransaction.is_credit ? '+' : '-'}
                </span>
                <input
                  id="new-amount"
                  type="number"
                  step="0.01"
                  value={newTransaction.amount}
                  onChange={(e) => setNewTransaction({...newTransaction, amount: e.target.value})}
                  className="form-input"
                  placeholder="0.00"
                  style={{ flex: 1 }}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="new-category">Catégorie :</label>
              <select
                id="new-category"
                value={newTransaction.category_id}
                onChange={(e) => setNewTransaction({...newTransaction, category_id: e.target.value, subcategory_id: ''})}
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
              <label htmlFor="new-subcategory">Sous-catégorie :</label>
              <select
                id="new-subcategory"
                value={newTransaction.subcategory_id}
                onChange={(e) => setNewTransaction({...newTransaction, subcategory_id: e.target.value})}
                className="form-select"
                disabled={!newTransaction.category_id}
              >
                <option value="">-</option>
                {getAvailableSubcategoriesForAdd().map((subcategory) => (
                  <option key={subcategory.id} value={subcategory.id}>
                    {subcategory.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="new-notes">Notes :</label>
              <textarea
                id="new-notes"
                value={newTransaction.notes}
                onChange={(e) => setNewTransaction({...newTransaction, notes: e.target.value})}
                className="form-textarea"
                rows="3"
                placeholder="Notes optionnelles"
              />
            </div>

            <div className="modal-actions">
              <button
                className="btn btn-secondary"
                onClick={() => setShowAddTransactionModal(false)}
              >
                Annuler
              </button>
              <button
                className="btn btn-primary"
                onClick={handleAddTransaction}
              >
                Ajouter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Checkpoint Modal */}
      {showCheckpointModal && (
        <div className="modal-overlay" onClick={() => setShowCheckpointModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{checkpointToEdit ? 'Modifier le point de contrôle' : 'Ajouter un point de contrôle'}</h2>

            <div className="form-group">
              <label htmlFor="checkpoint-date">Date * :</label>
              <input
                id="checkpoint-date"
                type="date"
                value={newCheckpoint.date}
                onChange={(e) => setNewCheckpoint({...newCheckpoint, date: e.target.value})}
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="checkpoint-balance">Solde bancaire * :</label>
              <input
                id="checkpoint-balance"
                type="number"
                step="0.01"
                value={newCheckpoint.balance}
                onChange={(e) => setNewCheckpoint({...newCheckpoint, balance: e.target.value})}
                className="form-input"
                placeholder="123.45"
                required
              />
              <small className="form-hint">Montant du solde tel qu'indiqué par votre banque</small>
            </div>

            <div className="form-group">
              <label htmlFor="checkpoint-notes">Notes :</label>
              <textarea
                id="checkpoint-notes"
                value={newCheckpoint.notes}
                onChange={(e) => setNewCheckpoint({...newCheckpoint, notes: e.target.value})}
                className="form-textarea"
                rows="2"
                placeholder="Notes optionnelles (ex: relevé de janvier)"
              />
            </div>

            <div className="modal-actions">
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setShowCheckpointModal(false)
                  setCheckpointToEdit(null)
                }}
              >
                Annuler
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSaveCheckpoint}
              >
                {checkpointToEdit ? 'Modifier' : 'Ajouter'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TransactionList
