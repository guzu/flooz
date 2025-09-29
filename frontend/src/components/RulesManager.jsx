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

          <div className="rules-grid">
            {rules.map((rule) => (
              <div key={rule.id} className="rule-card">
                <div className="rule-info">
                  <div className="rule-pattern">
                    <strong>Pattern :</strong>
                    <code>{rule.pattern}</code>
                  </div>
                  <div className="rule-category">
                    <strong>Catégorie :</strong>
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
                  </div>
                  <div className="rule-priority">
                    <strong>Priorité :</strong> {rule.priority}
                  </div>
                  {rule.created_at && (
                    <div className="rule-created">
                      <small>Créée le {new Date(rule.created_at).toLocaleDateString('fr-FR')}</small>
                    </div>
                  )}
                </div>
                <div className="rule-actions">
                  <button
                    onClick={() => handleDeleteRule(rule.id)}
                    className="btn btn-outline btn-sm"
                    title="Supprimer cette règle"
                  >
                    ❌
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default RulesManager