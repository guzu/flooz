import React, { useState, useEffect } from 'react'
import { formatAmount, formatDate, formatDateForInput, getAmountColor } from '../utils/formatters'

const TransactionRow = ({
  transaction,
  categories,
  subcategories,
  isEditing,
  onEdit,
  onSave,
  onCancel,
  onDelete,
  onFilter,
}) => {
  const [editData, setEditData] = useState({
    date: '',
    label: '',
    amount: '',
    category_id: '',
    subcategory_id: '',
    notes: '',
  })
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0 })

  useEffect(() => {
    if (isEditing) {
      setEditData({
        date: formatDateForInput(transaction.date),
        label: transaction.label,
        amount: Math.abs(transaction.amount).toString(),
        category_id: transaction.category_id || '',
        subcategory_id: transaction.subcategory_id || '',
        notes: transaction.notes || '',
      })
    }
  }, [isEditing, transaction])

  // Close context menu when clicking elsewhere
  useEffect(() => {
    const handleClickOutside = () => setContextMenu({ visible: false, x: 0, y: 0 })
    if (contextMenu.visible) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [contextMenu.visible])

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
      subcategory_id: editData.subcategory_id || null,
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

  const handleRightClick = (e) => {
    e.preventDefault()
    if (isEditing) return // Don't show context menu while editing

    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY
    })
  }

  const handleContextMenuEdit = (e) => {
    e.stopPropagation()
    setContextMenu({ visible: false, x: 0, y: 0 })
    onEdit()
  }

  const handleContextMenuDelete = (e) => {
    e.stopPropagation()
    setContextMenu({ visible: false, x: 0, y: 0 })
    onDelete()
  }

  const handleContextMenuFilter = (e) => {
    e.stopPropagation()
    setContextMenu({ visible: false, x: 0, y: 0 })
    onFilter(transaction.label)
  }

  const getCategoryInfo = () => {
    if (!transaction.category_id) return { name: 'Non catégorisé', color: '#6b7280' }
    return {
      name: transaction.category_name || 'Non catégorisé',
      color: transaction.category_color || '#6b7280'
    }
  }

  const getSubcategoryInfo = () => {
    if (!transaction.subcategory_id) return { name: '-' }
    return {
      name: transaction.subcategory_name || '-'
    }
  }

  const getAvailableSubcategories = () => {
    if (!editData.category_id) return []
    return subcategories.filter(sub => sub.category_id.toString() === editData.category_id)
  }

  // Reset subcategory when category changes
  const handleCategoryChange = (value) => {
    handleInputChange('category_id', value)
    handleInputChange('subcategory_id', '') // Reset subcategory when category changes
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
            onChange={(e) => handleCategoryChange(e.target.value)}
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
          <select
            value={editData.subcategory_id}
            onChange={(e) => handleInputChange('subcategory_id', e.target.value)}
            onKeyDown={handleKeyDown}
            className="edit-select"
            disabled={!editData.category_id}
          >
            <option value="">-</option>
            {getAvailableSubcategories().map((subcategory) => (
              <option key={subcategory.id} value={subcategory.id}>
                {subcategory.name}
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
  const subcategoryInfo = getSubcategoryInfo()

  return (
    <>
      <tr className="transaction-row" onDoubleClick={onEdit} onContextMenu={handleRightClick}>
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
      <td className="subcategory-col">
        {subcategoryInfo.name}
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
            onClick={() => onFilter(transaction.label)}
            className="btn btn-outline btn-sm"
            title="Filtrer par ce libellé"
          >
            🔍
          </button>
          <button
            onClick={onDelete}
            className="btn btn-outline btn-sm"
            title="Supprimer"
          >
            ❌
          </button>
        </div>
      </td>
      </tr>

      {/* Context Menu */}
      {contextMenu.visible && (
        <div
          className="context-menu"
          style={{
            position: 'fixed',
            left: contextMenu.x,
            top: contextMenu.y,
            zIndex: 1000
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="context-menu-item" onClick={handleContextMenuEdit}>
            ✏️ Modifier
          </div>
          <div className="context-menu-item" onClick={handleContextMenuFilter}>
            🔍 Filtrer
          </div>
          <div className="context-menu-item" onClick={handleContextMenuDelete}>
            ❌ Supprimer
          </div>
        </div>
      )}
    </>
  )
}

export default TransactionRow