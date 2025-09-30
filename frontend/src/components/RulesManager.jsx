import React, { useState, useEffect } from 'react'
import { apiService } from '../services/api'

const RulesManager = ({ categories }) => {
  const [rules, setRules] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadRules()
  }, [])

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

  const handleDeleteRule = async (ruleId) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette règle ?')) {
      try {
        await apiService.deleteCategorizationRule(ruleId)
        loadRules() // Reload rules after deletion
      } catch (error) {
        console.error('Error deleting rule:', error)
        alert('Erreur lors de la suppression de la règle')
      }
    }
  }

  const getCategoryName = (categoryId) => {
    const category = categories.find(cat => cat.id === categoryId)
    return category ? category.name : 'Catégorie inconnue'
  }

  const getCategoryColor = (categoryId) => {
    const category = categories.find(cat => cat.id === categoryId)
    return category ? category.color : '#6b7280'
  }

  if (loading) {
    return (
      <div className="loading">
        <p>Chargement des règles...</p>
      </div>
    )
  }

  return (
    <div className="rules-manager">
      <div className="rules-manager-header">
        <h2>Gestion des règles de catégorisation</h2>
        <p>
          Ces règles permettent de catégoriser automatiquement les transactions lors de l'import CSV.
          Les patterns sont recherchés dans les libellés des transactions.
        </p>
      </div>

      {rules.length === 0 ? (
        <div className="empty-state">
          <p>Aucune règle de catégorisation définie.</p>
          <p>Utilisez le bouton "🏷️ Règle" depuis la liste des transactions pour en créer.</p>
        </div>
      ) : (
        <div className="rules-list">
          <div className="rules-summary">
            <p><strong>{rules.length}</strong> règle(s) de catégorisation active(s)</p>
          </div>

          <div className="table-container">
            <table className="rules-table">
              <thead>
                <tr>
                  <th>Pattern</th>
                  <th>Catégorie</th>
                  <th>Priorité</th>
                  <th>Date de création</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rules.map((rule) => (
                  <tr key={rule.id}>
                    <td>
                      <code className="rule-pattern-code">{rule.pattern}</code>
                    </td>
                    <td>
                      <span
                        className="category-badge"
                        style={{
                          backgroundColor: getCategoryColor(rule.category_id) + '20',
                          color: getCategoryColor(rule.category_id),
                          border: `1px solid ${getCategoryColor(rule.category_id)}40`
                        }}
                      >
                        {getCategoryName(rule.category_id)}
                      </span>
                    </td>
                    <td className="rule-priority-cell">{rule.priority}</td>
                    <td className="rule-date-cell">
                      {rule.created_at ? new Date(rule.created_at).toLocaleDateString('fr-FR') : '-'}
                    </td>
                    <td className="rule-actions-cell">
                      <button
                        onClick={() => handleDeleteRule(rule.id)}
                        className="btn btn-outline btn-sm"
                        title="Supprimer cette règle"
                      >
                        ❌
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default RulesManager