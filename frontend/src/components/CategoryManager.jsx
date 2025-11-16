import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { apiService } from '../services/api'

const CategoryManager = ({ categories, onUpdate }) => {
  const { t } = useTranslation(['categories'])
  const [activeTab, setActiveTab] = useState('categories')
  const [subcategories, setSubcategories] = useState([])
  const [rules, setRules] = useState([])
  const [newRule, setNewRule] = useState({ pattern: '', category_id: '', priority: 0 })
  const [loading, setLoading] = useState(false)

  // Modal states
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [showSubcategoryModal, setShowSubcategoryModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [modalMode, setModalMode] = useState('create') // 'create' or 'edit'

  // Form states
  const [categoryForm, setCategoryForm] = useState({ name: '', color: '#3b82f6' })
  const [subcategoryForm, setSubcategoryForm] = useState({ name: '', category_id: '' })

  const predefinedColors = [
    '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e',
    '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
    '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#6b7280'
  ]

  useEffect(() => {
    loadSubcategories()
    if (activeTab === 'rules') {
      loadRules()
    }
  }, [activeTab])

  const loadSubcategories = async () => {
    try {
      const data = await apiService.getSubcategories()
      setSubcategories(data)
    } catch (error) {
      console.error('Error loading subcategories:', error)
    }
  }

  const loadRules = async () => {
    try {
      setLoading(true)
      const rulesData = await apiService.getCategorizationRules()
      setRules(rulesData)
    } catch (error) {
      console.error('Error loading rules:', error)
    } finally {
      setLoading(false)
    }
  }

  // Category handlers
  const openCategoryModal = (category = null) => {
    if (category) {
      setModalMode('edit')
      setEditingItem(category)
      setCategoryForm({ name: category.name, color: category.color })
    } else {
      setModalMode('create')
      setEditingItem(null)
      setCategoryForm({ name: '', color: '#3b82f6' })
    }
    setShowCategoryModal(true)
  }

  const handleCategorySubmit = async (e) => {
    e.preventDefault()
    try {
      if (modalMode === 'create') {
        await apiService.createCategory(categoryForm)
      } else {
        await apiService.updateCategory(editingItem.id, categoryForm)
      }
      setShowCategoryModal(false)
      setCategoryForm({ name: '', color: '#3b82f6' })
      onUpdate()
    } catch (error) {
      console.error('Error saving category:', error)
      alert(t('alerts.category.saveError'))
    }
  }

  const handleDeleteCategory = async (id, name) => {
    if (window.confirm(t('alerts.category.deleteConfirm', { name }))) {
      try {
        await apiService.deleteCategory(id)
        onUpdate()
      } catch (error) {
        console.error('Error deleting category:', error)
        alert(t('alerts.category.deleteError', { error: error.response?.data?.error || error.message }))
      }
    }
  }

  // Subcategory handlers
  const openSubcategoryModal = (subcategory = null, categoryId = null) => {
    if (subcategory) {
      setModalMode('edit')
      setEditingItem(subcategory)
      setSubcategoryForm({
        name: subcategory.name,
        category_id: subcategory.category_id
      })
    } else {
      setModalMode('create')
      setEditingItem(null)
      setSubcategoryForm({ name: '', category_id: categoryId || '' })
    }
    setShowSubcategoryModal(true)
  }

  const handleSubcategorySubmit = async (e) => {
    e.preventDefault()
    try {
      if (modalMode === 'create') {
        // Get parent category color
        const parentCategory = categories.find(c => c.id === parseInt(subcategoryForm.category_id))
        await apiService.createSubcategory({
          ...subcategoryForm,
          color: parentCategory?.color || '#6b7280'
        })
      } else {
        await apiService.updateSubcategory(editingItem.id, {
          name: subcategoryForm.name
        })
      }
      setShowSubcategoryModal(false)
      setSubcategoryForm({ name: '', category_id: '' })
      await loadSubcategories()
      onUpdate()
    } catch (error) {
      console.error('Error saving subcategory:', error)
      alert(t('alerts.subcategory.saveError'))
    }
  }

  const handleDeleteSubcategory = async (id, name) => {
    if (window.confirm(t('alerts.subcategory.deleteConfirm', { name }))) {
      try {
        await apiService.deleteSubcategory(id)
        await loadSubcategories()
        onUpdate()
      } catch (error) {
        console.error('Error deleting subcategory:', error)
        alert(t('alerts.subcategory.deleteError', { error: error.response?.data?.error || error.message }))
      }
    }
  }

  // Rule handlers
  const handleCreateRule = async (e) => {
    e.preventDefault()
    if (!newRule.pattern.trim() || !newRule.category_id) return

    try {
      await apiService.createCategorizationRule(newRule)
      setNewRule({ pattern: '', category_id: '', priority: 0 })
      loadRules()
    } catch (error) {
      console.error('Error creating rule:', error)
      alert(t('alerts.rule.createError'))
    }
  }

  const handleDeleteRule = async (id) => {
    if (window.confirm(t('alerts.rule.deleteConfirm'))) {
      try {
        await apiService.deleteCategorizationRule(id)
        loadRules()
      } catch (error) {
        console.error('Error deleting rule:', error)
        alert(t('alerts.rule.deleteError'))
      }
    }
  }

  // Build hierarchical data structure
  const getHierarchicalData = () => {
    return categories
      .filter(category => category.name !== t('list.uncategorized'))
      .map(category => ({
        ...category,
        subcategories: subcategories
          .filter(sub => sub.category_id === category.id)
          .map(sub => ({
            ...sub,
            // Inherit parent category color if subcategory has no color
            displayColor: sub.color || category.color
          }))
      }))
  }

  const renderCategoriesTab = () => {
    const hierarchicalData = getHierarchicalData()

    return (
      <div className="categories-tab">
        <div className="section">
          <div className="section-header">
            <h3>{t('list.title')}</h3>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => openCategoryModal()}
            >
              {t('list.newCategory')}
            </button>
          </div>

          <div className="table-container">
            <table className="categories-table">
              <thead>
                <tr>
                  <th>{t('list.columns.name')}</th>
                  <th style={{ width: '100px' }}>{t('list.columns.color')}</th>
                  <th style={{ width: '120px' }}>{t('list.columns.transactions')}</th>
                  <th style={{ width: '150px' }}>{t('list.columns.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {hierarchicalData.map(category => (
                  <React.Fragment key={`cat-${category.id}`}>
                    {/* Category row */}
                    <tr className="category-row">
                      <td className="category-name-cell">
                        <strong>{category.name}</strong>
                      </td>
                      <td className="category-color-cell">
                        <div
                          className="color-indicator"
                          style={{ backgroundColor: category.color }}
                          title={category.color}
                        />
                      </td>
                      <td className="category-count-cell">
                        {category.transaction_count || 0}
                      </td>
                      <td className="category-actions-cell">
                        <button
                          onClick={() => openSubcategoryModal(null, category.id)}
                          className="btn btn-outline btn-sm"
                          title={t('list.tooltips.addSubcategory')}
                        >
                          ➕
                        </button>
                        <button
                          onClick={() => openCategoryModal(category)}
                          className="btn btn-outline btn-sm"
                          title={t('list.tooltips.edit')}
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(category.id, category.name)}
                          className="btn btn-outline btn-sm"
                          title={t('list.tooltips.delete')}
                          disabled={category.transaction_count > 0}
                        >
                          ❌
                        </button>
                      </td>
                    </tr>

                    {/* Subcategory rows */}
                    {category.subcategories.map(subcategory => (
                      <tr key={`sub-${subcategory.id}`} className="subcategory-row">
                        <td className="subcategory-name-cell">
                          <span className="indent">↳</span> {subcategory.name}
                        </td>
                        <td className="category-color-cell">
                          <div
                            className="color-indicator"
                            style={{ backgroundColor: subcategory.displayColor }}
                            title={subcategory.displayColor}
                          />
                        </td>
                        <td className="category-count-cell">
                          -
                        </td>
                        <td className="category-actions-cell">
                          <button
                            onClick={() => openSubcategoryModal(subcategory)}
                            className="btn btn-outline btn-sm"
                            title={t('list.tooltips.edit')}
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDeleteSubcategory(subcategory.id, subcategory.name)}
                            className="btn btn-outline btn-sm"
                            title={t('list.tooltips.delete')}
                          >
                            ❌
                          </button>
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Category Modal */}
        {showCategoryModal && (
          <div className="modal-overlay" onClick={() => setShowCategoryModal(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h3>{modalMode === 'create' ? t('modal.category.titleCreate') : t('modal.category.titleEdit')}</h3>
              <form onSubmit={handleCategorySubmit}>
                <div className="form-group">
                  <label>{t('modal.category.nameLabel')}</label>
                  <input
                    type="text"
                    value={categoryForm.name}
                    onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                    placeholder={t('modal.category.namePlaceholder')}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>{t('modal.category.colorLabel')}</label>
                  <div className="color-picker">
                    <input
                      type="color"
                      value={categoryForm.color}
                      onChange={(e) => setCategoryForm({ ...categoryForm, color: e.target.value })}
                    />
                    <div className="color-presets">
                      {predefinedColors.map(color => (
                        <button
                          key={color}
                          type="button"
                          className="color-preset"
                          style={{ backgroundColor: color }}
                          onClick={() => setCategoryForm({ ...categoryForm, color })}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="modal-actions">
                  <button type="submit" className="btn btn-primary">
                    {modalMode === 'create' ? t('modal.actions.create') : t('modal.actions.save')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCategoryModal(false)}
                    className="btn btn-secondary"
                  >
                    {t('modal.actions.cancel')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Subcategory Modal */}
        {showSubcategoryModal && (
          <div className="modal-overlay" onClick={() => setShowSubcategoryModal(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h3>{modalMode === 'create' ? t('modal.subcategory.titleCreate') : t('modal.subcategory.titleEdit')}</h3>
              <form onSubmit={handleSubcategorySubmit}>
                {modalMode === 'create' && (
                  <div className="form-group">
                    <label>{t('modal.subcategory.parentLabel')}</label>
                    <select
                      value={subcategoryForm.category_id}
                      onChange={(e) => setSubcategoryForm({ ...subcategoryForm, category_id: e.target.value })}
                      required
                    >
                      <option value="">{t('modal.subcategory.parentPlaceholder')}</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="form-group">
                  <label>{t('modal.subcategory.nameLabel')}</label>
                  <input
                    type="text"
                    value={subcategoryForm.name}
                    onChange={(e) => setSubcategoryForm({ ...subcategoryForm, name: e.target.value })}
                    placeholder={t('modal.subcategory.namePlaceholder')}
                    required
                  />
                  <small>{t('modal.subcategory.colorInherit')}</small>
                </div>
                <div className="modal-actions">
                  <button type="submit" className="btn btn-primary">
                    {modalMode === 'create' ? t('modal.actions.create') : t('modal.actions.save')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowSubcategoryModal(false)}
                    className="btn btn-secondary"
                  >
                    {t('modal.actions.cancel')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderRulesTab = () => (
    <div className="rules-tab">
      <div className="section">
        <h3>{t('rules.newTitle')}</h3>
        <form onSubmit={handleCreateRule} className="rule-form">
          <div className="form-group">
            <label htmlFor="rule-pattern">{t('rules.form.patternLabel')}</label>
            <input
              id="rule-pattern"
              type="text"
              value={newRule.pattern}
              onChange={(e) => setNewRule({ ...newRule, pattern: e.target.value })}
              placeholder={t('rules.form.patternPlaceholder')}
              required
            />
            <small>{t('rules.form.patternHelp')}</small>
          </div>
          <div className="form-group">
            <label htmlFor="rule-category">{t('rules.form.categoryLabel')}</label>
            <select
              id="rule-category"
              value={newRule.category_id}
              onChange={(e) => setNewRule({ ...newRule, category_id: e.target.value })}
              required
            >
              <option value="">{t('rules.form.categoryPlaceholder')}</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="rule-priority">{t('rules.form.priorityLabel')}</label>
            <input
              id="rule-priority"
              type="number"
              value={newRule.priority}
              onChange={(e) => setNewRule({ ...newRule, priority: parseInt(e.target.value) })}
              min="0"
              max="100"
            />
            <small>{t('rules.form.priorityHelp')}</small>
          </div>
          <button type="submit" className="btn btn-primary">
            {t('rules.form.submit')}
          </button>
        </form>
      </div>

      <div className="section">
        <h3>{t('rules.existingTitle')}</h3>
        {loading ? (
          <p>{t('rules.loading')}</p>
        ) : rules.length === 0 ? (
          <p>{t('rules.empty')}</p>
        ) : (
          <div className="table-container">
            <table className="rules-table">
              <thead>
                <tr>
                  <th>{t('rules.table.pattern')}</th>
                  <th>{t('rules.table.category')}</th>
                  <th>{t('rules.table.priority')}</th>
                  <th>{t('rules.table.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {rules.map(rule => (
                  <tr key={rule.id}>
                    <td>
                      <code className="rule-pattern-code">{rule.pattern}</code>
                    </td>
                    <td>
                      <span
                        className="category-badge"
                        style={{
                          backgroundColor: rule.category_color + '20',
                          color: rule.category_color,
                          border: `1px solid ${rule.category_color}40`
                        }}
                      >
                        {rule.category_name}
                      </span>
                    </td>
                    <td className="rule-priority-cell">{rule.priority}</td>
                    <td className="rule-actions-cell">
                      <button
                        onClick={() => handleDeleteRule(rule.id)}
                        className="btn btn-outline btn-sm"
                        title={t('list.tooltips.delete')}
                      >
                        ❌
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div className="category-manager">
      <div className="category-manager-header">
        <h2>{t('title')}</h2>
        <div className="tabs">
          <button
            className={activeTab === 'categories' ? 'active' : ''}
            onClick={() => setActiveTab('categories')}
          >
            {t('tabs.categories')}
          </button>
          <button
            className={activeTab === 'rules' ? 'active' : ''}
            onClick={() => setActiveTab('rules')}
          >
            {t('tabs.rules')}
          </button>
        </div>
      </div>

      <div className="tab-content">
        {activeTab === 'categories' ? renderCategoriesTab() : renderRulesTab()}
      </div>
    </div>
  )
}

export default CategoryManager