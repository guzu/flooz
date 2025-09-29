import React, { useState, useEffect } from 'react'
import { formatAmount, formatDate, formatDateForInput, getAmountColor } from '../utils/formatters'

const TransactionRow = ({
  transaction,
  categories,
  isEditing,
  onEdit,
  onSave,
  onCancel,
  onDelete,
}) => {
  const [editData, setEditData] = useState({
    date: '',
    label: '',
    amount: '',
    category_id: '',
    notes: '',
  })

  useEffect(() => {
    if (isEditing) {
      setEditData({
        date: formatDateForInput(transaction.date),
        label: transaction.label,
        amount: Math.abs(transaction.amount).toString(),
        category_id: transaction.category_id || '',
        notes: transaction.notes || '',
      })
    }
  }, [isEditing, transaction])

  const handleInputChange = (field, value) => {
    setEditData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSave = () => {
    const amount = parseFloat(editData.amount)
    if (isNaN(amount)) {
      alert('Le montant doit être un nombre valide')
      return
    }

    // Keep original sign (positive for expenses, negative for income)
    const finalAmount = transaction.amount < 0 ? -amount : amount

    onSave({
      date: editData.date,
      label: editData.label.trim(),
      amount: finalAmount,
      category_id: editData.category_id || null,
      notes: editData.notes.trim() || null,
    })
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSave()
    } else if (e.key === 'Escape') {
      onCancel()
    }
  }

  const getCategoryInfo = () => {
    if (!transaction.category_id) return { name: 'Non catégorisé', color: '#6b7280' }
    return {
      name: transaction.category_name || 'Non catégorisé',
      color: transaction.category_color || '#6b7280'
    }
  }

  if (isEditing) {
    return (
      <tr className="transaction-row editing">
        <td>
          <input
            type="date"
            value={editData.date}
            onChange={(e) => handleInputChange('date', e.target.value)}
            onKeyDown={handleKeyDown}
            className="edit-input"
          />
        </td>
        <td>
          <input
            type="text"
            value={editData.label}
            onChange={(e) => handleInputChange('label', e.target.value)}
            onKeyDown={handleKeyDown}
            className="edit-input"
            placeholder="Libellé de la transaction"
          />
        </td>
        <td>
          <input
            type="number"
            value={editData.amount}
            onChange={(e) => handleInputChange('amount', e.target.value)}
            onKeyDown={handleKeyDown}
            className="edit-input amount-input"
            step="0.01"
            min="0"
            placeholder="0.00"
          />
        </td>
        <td>
          <select
            value={editData.category_id}
            onChange={(e) => handleInputChange('category_id', e.target.value)}
            onKeyDown={handleKeyDown}
            className="edit-select"
          >
            <option value="">Non catégorisé</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </td>
        <td>
          <div className="edit-actions">
            <button
              onClick={handleSave}
              className="btn btn-success btn-sm"
              title="Sauvegarder"
            >
              ✓
            </button>
            <button
              onClick={onCancel}
              className="btn btn-secondary btn-sm"
              title="Annuler"
            >
              ✗
            </button>
          </div>
        </td>
      </tr>
    )
  }

  const categoryInfo = getCategoryInfo()

  return (
    <tr className="transaction-row" onDoubleClick={onEdit}>
      <td className="date-col">
        {formatDate(transaction.date)}
      </td>
      <td className="label-col">
        <div className="label-container">
          <span className="label-text">{transaction.label}</span>
          {transaction.notes && (
            <span className="notes-text" title={transaction.notes}>
              📝 {transaction.notes}
            </span>
          )}
        </div>
      </td>
      <td className="amount-col">
        <span
          className="amount-value"
          style={{ color: getAmountColor(transaction.amount) }}
        >
          {formatAmount(transaction.amount)}
        </span>
      </td>
      <td className="category-col">
        <span
          className="category-badge"
          style={{
            backgroundColor: categoryInfo.color + '20',
            color: categoryInfo.color,
            border: `1px solid ${categoryInfo.color}40`
          }}
        >
          {categoryInfo.name}
        </span>
      </td>
      <td className="actions-col">
        <div className="action-buttons">
          <button
            onClick={onEdit}
            className="btn btn-outline btn-sm"
            title="Modifier"
          >
            ✏️
          </button>
          <button
            onClick={onDelete}
            className="btn btn-danger btn-sm"
            title="Supprimer"
          >
            🗑️
          </button>
        </div>
      </td>
    </tr>
  )
}

export default TransactionRow