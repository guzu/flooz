import React, { useState, useEffect } from 'react'
import { formatAmount, formatDate, formatDateForInput, getAmountColor } from '../utils/formatters'

const TransactionRow = ({
  transaction,
  categories,
  subcategories,
  onCategorize,
  onDelete,
  onFilter,
  isSelected,
  onSelect,
  index,
  hasMultipleSelected,
}) => {
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0 })

  // Close context menu when clicking elsewhere
  useEffect(() => {
    const handleClickOutside = () => setContextMenu({ visible: false, x: 0, y: 0 })
    if (contextMenu.visible) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [contextMenu.visible])

  const handleRightClick = (e) => {
    e.preventDefault()
    // Select this transaction if not already selected
    if (!isSelected) {
      onSelect(transaction, index, e)
    }
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY
    })
  }

  const handleActionsClick = (e) => {
    e.stopPropagation()
    if (contextMenu.visible) {
      setContextMenu({ visible: false, x: 0, y: 0 })
    } else {
      const rect = e.currentTarget.getBoundingClientRect()
      setContextMenu({
        visible: true,
        x: rect.left,
        y: rect.bottom + 5
      })
    }
  }

  const handleClick = (e) => {
    onSelect(transaction, index, e)
  }

  const handleContextMenuCategorize = (e) => {
    e.stopPropagation()
    setContextMenu({ visible: false, x: 0, y: 0 })
    onCategorize()
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

  const categoryInfo = getCategoryInfo()
  const subcategoryInfo = getSubcategoryInfo()

  return (
    <>
      <tr
        className={`transaction-row ${isSelected ? 'selected' : ''}`}
        onContextMenu={handleRightClick}
        onClick={handleClick}
      >
      <td className="date-col">
        {formatDate(transaction.date)}
      </td>
      <td className="operation-date-col">
        {transaction.operation_date ? formatDate(transaction.operation_date) : '-'}
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
        <button
          onClick={handleActionsClick}
          className="btn btn-outline btn-sm"
          title="Actions"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="1"></circle>
            <circle cx="12" cy="5" r="1"></circle>
            <circle cx="12" cy="19" r="1"></circle>
          </svg>
        </button>
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
          <div className="context-menu-item" onClick={handleContextMenuCategorize}>
            <span className="context-menu-icon">🏷️</span>
            <span>Catégoriser</span>
          </div>
          <div
            className={`context-menu-item ${hasMultipleSelected ? 'disabled' : ''}`}
            onClick={hasMultipleSelected ? undefined : handleContextMenuFilter}
          >
            <span className="context-menu-icon">🔍</span>
            <span>Filtrer</span>
          </div>
          <div
            className={`context-menu-item ${hasMultipleSelected ? 'disabled' : ''}`}
            onClick={hasMultipleSelected ? undefined : handleContextMenuDelete}
          >
            <span className="context-menu-icon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </span>
            <span>Supprimer</span>
          </div>
        </div>
      )}
    </>
  )
}

export default TransactionRow