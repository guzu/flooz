import React, { useState, useEffect } from 'react'
import { apiService } from '../services/api'

const CategoryManager = ({ categories, onUpdate }) => {
  const [activeTab, setActiveTab] = useState('categories')
  const [editingCategory, setEditingCategory] = useState(null)
  const [newCategory, setNewCategory] = useState({ name: '', color: '#3b82f6', icon: '' })
  const [rules, setRules] = useState([])
  const [newRule, setNewRule] = useState({ pattern: '', category_id: '', priority: 0 })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (activeTab === 'rules') {
      loadRules()
    }
  }, [activeTab])

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

  const handleCreateCategory = async (e) => {
    e.preventDefault()
    if (!newCategory.name.trim()) return

    try {
      await apiService.createCategory(newCategory)
      setNewCategory({ name: '', color: '#3b82f6', icon: '' })
      onUpdate()
    } catch (error) {
      console.error('Error creating category:', error)
      alert('Erreur lors de la création de la catégorie')
    }
  }

  const handleUpdateCategory = async (id, updatedData) => {
    try {
      await apiService.updateCategory(id, updatedData)
      setEditingCategory(null)
      onUpdate()
    } catch (error) {
      console.error('Error updating category:', error)
      alert('Erreur lors de la mise à jour de la catégorie')
    }
  }

  const handleDeleteCategory = async (id, name) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer la catégorie "${name}" ?`)) {
      try {
        await apiService.deleteCategory(id)
        onUpdate()
      } catch (error) {
        console.error('Error deleting category:', error)
        alert('Erreur lors de la suppression : ' + (error.response?.data?.error || error.message))
      }
    }
  }

  const handleCreateRule = async (e) => {
    e.preventDefault()
    if (!newRule.pattern.trim() || !newRule.category_id) return

    try {
      await apiService.createCategorizationRule(newRule)
      setNewRule({ pattern: '', category_id: '', priority: 0 })
      loadRules()
    } catch (error) {
      console.error('Error creating rule:', error)
      alert('Erreur lors de la création de la règle')
    }
  }

  const handleDeleteRule = async (id) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette règle ?')) {
      try {
        await apiService.deleteCategorizationRule(id)
        loadRules()
      } catch (error) {
        console.error('Error deleting rule:', error)
        alert('Erreur lors de la suppression de la règle')
      }
    }
  }

  const predefinedColors = [
    '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e',
    '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
    '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#6b7280'
  ]

  const renderCategoriesTab = () => (
    <div className="categories-tab">
      <div className="section">
        <h3>➕ Nouvelle catégorie</h3>
        <form onSubmit={handleCreateCategory} className="category-form">
          <div className="form-group">
            <label htmlFor="category-name">Nom :</label>
            <input
              id="category-name"
              type="text"
              value={newCategory.name}
              onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
              placeholder="Nom de la catégorie"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="category-color">Couleur :</label>
            <div className="color-picker">
              <input
                id="category-color"
                type="color"
                value={newCategory.color}
                onChange={(e) => setNewCategory({ ...newCategory, color: e.target.value })}
              />
              <div className="color-presets">
                {predefinedColors.map(color => (
                  <button
                    key={color}
                    type="button"
                    className="color-preset"
                    style={{ backgroundColor: color }}
                    onClick={() => setNewCategory({ ...newCategory, color })}
                  />
                ))}
              </div>
            </div>
          </div>
          <button type="submit" className="btn btn-primary">
            Créer la catégorie
          </button>
        </form>
      </div>

      <div className="section">
        <h3>📋 Catégories existantes</h3>
        <div className="categories-grid">
          {categories.map(category => (
            <div key={category.id} className="category-card">
              <div className="category-info">
                <div
                  className="category-color-indicator"
                  style={{ backgroundColor: category.color }}
                />
                <div className="category-details">
                  <h4>{category.name}</h4>
                  <p>{category.transaction_count} transaction(s)</p>
                </div>
              </div>
              <div className="category-actions">
                <button
                  onClick={() => setEditingCategory(category)}
                  className="btn btn-outline btn-sm"
                  title="Modifier"
                >
                  ✏️
                </button>
                <button
                  onClick={() => handleDeleteCategory(category.id, category.name)}
                  className="btn btn-outline btn-sm"
                  title="Supprimer"
                  disabled={category.transaction_count > 0}
                >
                  ❌
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {editingCategory && (
        <div className="modal-overlay" onClick={() => setEditingCategory(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Modifier la catégorie</h3>
            <form onSubmit={(e) => {
              e.preventDefault()
              handleUpdateCategory(editingCategory.id, {
                name: editingCategory.name,
                color: editingCategory.color,
                icon: editingCategory.icon
              })
            }}>
              <div className="form-group">
                <label>Nom :</label>
                <input
                  type="text"
                  value={editingCategory.name}
                  onChange={(e) => setEditingCategory({
                    ...editingCategory,
                    name: e.target.value
                  })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Couleur :</label>
                <div className="color-picker">
                  <input
                    type="color"
                    value={editingCategory.color}
                    onChange={(e) => setEditingCategory({
                      ...editingCategory,
                      color: e.target.value
                    })}
                  />
                  <div className="color-presets">
                    {predefinedColors.map(color => (
                      <button
                        key={color}
                        type="button"
                        className="color-preset"
                        style={{ backgroundColor: color }}
                        onClick={() => setEditingCategory({
                          ...editingCategory,
                          color
                        })}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div className="modal-actions">
                <button type="submit" className="btn btn-primary">
                  Sauvegarder
                </button>
                <button
                  type="button"
                  onClick={() => setEditingCategory(null)}
                  className="btn btn-secondary"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )

  const renderRulesTab = () => (
    <div className="rules-tab">
      <div className="section">
        <h3>➕ Nouvelle règle de catégorisation</h3>
        <form onSubmit={handleCreateRule} className="rule-form">
          <div className="form-group">
            <label htmlFor="rule-pattern">Motif de recherche :</label>
            <input
              id="rule-pattern"
              type="text"
              value={newRule.pattern}
              onChange={(e) => setNewRule({ ...newRule, pattern: e.target.value })}
              placeholder="Ex: CARREFOUR|AUCHAN|LECLERC"
              required
            />
            <small>Utilisez | pour séparer plusieurs mots-clés</small>
          </div>
          <div className="form-group">
            <label htmlFor="rule-category">Catégorie :</label>
            <select
              id="rule-category"
              value={newRule.category_id}
              onChange={(e) => setNewRule({ ...newRule, category_id: e.target.value })}
              required
            >
              <option value="">Choisir une catégorie</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="rule-priority">Priorité :</label>
            <input
              id="rule-priority"
              type="number"
              value={newRule.priority}
              onChange={(e) => setNewRule({ ...newRule, priority: parseInt(e.target.value) })}
              min="0"
              max="100"
            />
            <small>Plus la priorité est élevée, plus la règle sera appliquée en premier</small>
          </div>
          <button type="submit" className="btn btn-primary">
            Créer la règle
          </button>
        </form>
      </div>

      <div className="section">
        <h3>⚙️ Règles existantes</h3>
        {loading ? (
          <p>Chargement des règles...</p>
        ) : rules.length === 0 ? (
          <p>Aucune règle de catégorisation définie</p>
        ) : (
          <div className="rules-list">
            {rules.map(rule => (
              <div key={rule.id} className="rule-card">
                <div className="rule-info">
                  <div className="rule-pattern">
                    <strong>Motif :</strong> <code>{rule.pattern}</code>
                  </div>
                  <div className="rule-category">
                    <strong>Catégorie :</strong>
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
                  </div>
                  <div className="rule-priority">
                    <strong>Priorité :</strong> {rule.priority}
                  </div>
                </div>
                <div className="rule-actions">
                  <button
                    onClick={() => handleDeleteRule(rule.id)}
                    className="btn btn-outline btn-sm"
                    title="Supprimer"
                  >
                    ❌
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div className="category-manager">
      <div className="category-manager-header">
        <h2>🏷️ Gestion des catégories</h2>
        <div className="tabs">
          <button
            className={activeTab === 'categories' ? 'active' : ''}
            onClick={() => setActiveTab('categories')}
          >
            Catégories
          </button>
          <button
            className={activeTab === 'rules' ? 'active' : ''}
            onClick={() => setActiveTab('rules')}
          >
            Règles automatiques
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