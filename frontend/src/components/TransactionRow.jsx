import React, { useState, useEffect } from 'react'
import { formatAmount, formatDate, formatDateForInput, getAmountColor } from '../utils/formatters'

const TransactionRow = ({
  transaction,
  categories,
  subcategories,
  onCategorize,
  onDelete,
  onFilter,
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
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY
    })
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
      <tr className="transaction-row" onContextMenu={handleRightClick}>
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
            onClick={onCategorize}
            className="btn btn-outline btn-sm"
            title="Catégoriser"
          >
            🏷️
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
          <div className="context-menu-item" onClick={handleContextMenuCategorize}>
            🏷️ Catégoriser
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