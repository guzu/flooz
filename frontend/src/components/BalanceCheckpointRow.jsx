import React, { useState, useEffect } from 'react'
import { formatAmount, formatDate } from '../utils/formatters'

const BalanceCheckpointRow = ({ checkpoint, calculatedBalance, onDelete, onEdit, visibleColumns }) => {
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0 })
  const hasError = calculatedBalance !== null && Math.abs(calculatedBalance - checkpoint.balance) > 0.01

  // Calculate colspan for label cell (operation_date + label + notes)
  let labelColSpan = 0
  if (visibleColumns.operation_date) labelColSpan++
  if (visibleColumns.label) labelColSpan++
  if (visibleColumns.notes) labelColSpan++

  // Close context menu when clicking elsewhere
  useEffect(() => {
    const handleClickOutside = () => setContextMenu({ visible: false, x: 0, y: 0 })
    if (contextMenu.visible) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [contextMenu.visible])

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

  const handleEdit = (e) => {
    e.stopPropagation()
    setContextMenu({ visible: false, x: 0, y: 0 })
    onEdit(checkpoint)
  }

  const handleDelete = (e) => {
    e.stopPropagation()
    setContextMenu({ visible: false, x: 0, y: 0 })
    if (confirm('Supprimer ce point de contrôle ?')) {
      onDelete(checkpoint.id)
    }
  }

  return (
    <>
      <tr className="checkpoint-row">
        {visibleColumns.date && (
          <td className="date-col">
            {formatDate(checkpoint.date)}
          </td>
        )}
        {labelColSpan > 0 && (
          <td className="label-col checkpoint-label" colSpan={labelColSpan}>
            <div className="checkpoint-info">
              <span className="checkpoint-text">
                Solde de référence
                {checkpoint.notes && <span className="checkpoint-notes"> - {checkpoint.notes}</span>}
              </span>
            </div>
          </td>
        )}
        {visibleColumns.amount && (
          <td className="amount-col checkpoint-balance">
          <span
            className={`balance-value ${hasError ? 'error' : ''}`}
          >
            {formatAmount(checkpoint.balance)}
          </span>
          {calculatedBalance !== null && (
            <span className="calculated-balance">
              {hasError && (
                <span className="error-indicator" title={`Solde calculé: ${formatAmount(calculatedBalance)}`}>
                  ⚠️ Écart: {formatAmount(calculatedBalance - checkpoint.balance)}
                </span>
              )}
            </span>
          )}
          </td>
        )}
        {visibleColumns.category && (
          <td className="category-col">
          </td>
        )}
        {visibleColumns.subcategory && (
          <td className="subcategory-col">
          </td>
        )}
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
          <div className="context-menu-item" onClick={handleEdit}>
            <span className="context-menu-icon">✏️</span>
            <span>Modifier</span>
          </div>
          <div className="context-menu-item" onClick={handleDelete}>
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

export default BalanceCheckpointRow
