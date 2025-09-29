import React, { useState } from 'react'
import TransactionRow from './TransactionRow'
import YearSelector from './Charts/YearSelector'
import { apiService } from '../services/api'

const TransactionList = ({ transactions, categories, subcategories, onUpdate, loading, availableYears, selectedYear, onYearChange }) => {
  const [editingId, setEditingId] = useState(null)
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' })

  const handleSort = (key) => {
    let direction = 'asc'
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    setSortConfig({ key, direction })
  }

  const sortedTransactions = React.useMemo(() => {
    let sortableTransactions = [...transactions]
    if (sortConfig.key) {
      sortableTransactions.sort((a, b) => {
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
    return sortableTransactions
  }, [transactions, sortConfig])

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

  return (
    <div className="transaction-list">
      <div className="transaction-summary">
        <div className="summary-left">
          <p>
            <strong>{transactions.length}</strong> transaction(s) trouvée(s)
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
            {sortedTransactions.map((transaction) => (
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
