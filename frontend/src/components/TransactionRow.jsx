import React, { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { formatAmount, formatDate, formatDateForInput, getAmountColor } from '../utils/formatters'

const TransactionRow = ({
  transaction,
  categories,
  subcategories,
  onCategorize,
  onDelete,
  onFilter,
  onUpdate,
  isSelected,
  onSelect,
  index,
  hasMultipleSelected,
  visibleColumns,
}) => {
  const { t } = useTranslation(['transactions', 'common'])
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0 })
  const [notes, setNotes] = useState(transaction.notes || '')
  const originalNotesRef = useRef(transaction.notes || '')
  const shouldSaveRef = useRef(true)

  // Sync notes when transaction changes
  useEffect(() => {
    setNotes(transaction.notes || '')
    originalNotesRef.current = transaction.notes || ''
  }, [transaction.notes])

  const handleNotesFocus = () => {
    // Store the current value when starting to edit
    originalNotesRef.current = notes
    shouldSaveRef.current = true
  }

  const handleNotesSave = async () => {
    // Don't save if we're canceling
    if (!shouldSaveRef.current) {
      shouldSaveRef.current = true
      return
    }

    const trimmedNotes = notes.trim() || null
    const currentNotes = transaction.notes || null

    if (trimmedNotes !== currentNotes) {
      try {
        const { apiService } = await import('../services/api')
        await apiService.updateTransaction(transaction.id, { notes: trimmedNotes })
        // Don't call onUpdate() to avoid reloading all transactions
        // The local state is already updated
        transaction.notes = trimmedNotes
      } catch (error) {
        console.error('Error updating notes:', error)
        setNotes(transaction.notes || '')
      }
    }
  }

  const handleNotesKeyDown = (e) => {
    if (e.key === 'Escape') {
      // Cancel: restore original value and prevent save
      shouldSaveRef.current = false
      setNotes(originalNotesRef.current)
      e.target.blur()
    } else if (e.key === 'Enter') {
      // Save and blur
      shouldSaveRef.current = true
      e.target.blur()
    }
  }

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
    if (!transaction.category_id) return { name: t('row.uncategorized'), color: '#6b7280' }
    return {
      name: transaction.category_name || t('row.uncategorized'),
      color: transaction.category_color || '#6b7280'
    }
  }

  const getSubcategoryInfo = () => {
    if (!transaction.subcategory_id) return { name: t('row.noSubcategory') }
    return {
      name: transaction.subcategory_name || t('row.noSubcategory')
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
      {visibleColumns.date && (
        <td className="date-col">
          {formatDate(transaction.date)}
        </td>
      )}
      {visibleColumns.operation_date && (
        <td className="operation-date-col">
          {transaction.operation_date ? formatDate(transaction.operation_date) : '-'}
        </td>
      )}
      {visibleColumns.label && (
        <td className="label-col">
          <div className="label-container">
            <span className="label-text">{transaction.label}</span>
          </div>
        </td>
      )}
      {visibleColumns.notes && (
        <td className="notes-col">
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onFocus={handleNotesFocus}
            onBlur={handleNotesSave}
            onKeyDown={handleNotesKeyDown}
            onClick={(e) => e.stopPropagation()}
            className="notes-input"
            placeholder={t('row.notesPlaceholder')}
          />
        </td>
      )}
      {visibleColumns.amount && (
        <td className="amount-col">
          <span
            className="amount-value"
            style={{ color: getAmountColor(transaction.amount) }}
          >
            {formatAmount(transaction.amount)}
          </span>
        </td>
      )}
      {visibleColumns.category && (
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
      )}
      {visibleColumns.subcategory && (
        <td className="subcategory-col">
          {subcategoryInfo.name}
        </td>
      )}
      <td className="actions-col">
        <button
          onClick={handleActionsClick}
          className="btn btn-outline btn-sm"
          title={t('row.actions')}
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
            <span>{t('row.contextMenu.categorize')}</span>
          </div>
          <div
            className={`context-menu-item ${hasMultipleSelected ? 'disabled' : ''}`}
            onClick={hasMultipleSelected ? undefined : handleContextMenuFilter}
          >
            <span className="context-menu-icon">🔍</span>
            <span>{t('row.contextMenu.filter')}</span>
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
            <span>{t('row.contextMenu.delete')}</span>
          </div>
        </div>
      )}
    </>
  )
}

export default TransactionRow