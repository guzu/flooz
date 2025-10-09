import React, { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import AIConfigModal from './AIConfigModal'
import { apiService } from '../services/api'

const AIAnalysisPanel = ({ availableYears }) => {
  const [analysisMode, setAnalysisMode] = useState('single') // 'single' or 'compare'
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedYears, setSelectedYears] = useState([])
  const [analysisType, setAnalysisType] = useState('overview')
  const [analysis, setAnalysis] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showConfigModal, setShowConfigModal] = useState(false)
  const [hasConfig, setHasConfig] = useState(false)
  const [provider, setProvider] = useState('ollama')

  useEffect(() => {
    // Check if IA is configured
    const savedProvider = localStorage.getItem('ai_provider') || 'ollama'
    const savedKey = localStorage.getItem('anthropic_api_key')

    setProvider(savedProvider)

    // For Claude, we need an API key. For Ollama, we assume it's configured
    if (savedProvider === 'claude') {
      setHasConfig(!!savedKey)
    } else if (savedProvider === 'ollama') {
      setHasConfig(true) // Assume Ollama is always ready
    }
  }, [])

  useEffect(() => {
    // Reset selections when mode changes
    if (analysisMode === 'compare') {
      setSelectedYears([])
    }
  }, [analysisMode])

  const handleYearToggle = (year) => {
    setSelectedYears(prev => {
      if (prev.includes(year)) {
        return prev.filter(y => y !== year)
      } else {
        return [...prev, year].sort()
      }
    })
  }

  const handleAnalyze = async () => {
    setError(null)
    setAnalysis(null)

    // Check configuration based on provider
    const currentProvider = localStorage.getItem('ai_provider') || 'ollama'
    const apiKey = localStorage.getItem('anthropic_api_key')
    const ollamaModel = localStorage.getItem('ollama_model') || 'llama3.2:3b'

    if (currentProvider === 'claude' && !apiKey) {
      setError('Aucune clé API configurée. Veuillez configurer votre clé API Claude.')
      setShowConfigModal(true)
      return
    }

    setLoading(true)

    try {
      if (analysisMode === 'single') {
        // Single year analysis
        const result = await apiService.analyzeSingleYear(
          selectedYear,
          analysisType,
          currentProvider,
          currentProvider === 'claude' ? apiKey : null,
          currentProvider === 'ollama' ? ollamaModel : null
        )
        setAnalysis({
          type: 'single',
          year: selectedYear,
          analysisType,
          text: result.analysis,
          data: result.financial_data
        })
      } else {
        // Multi-year comparison
        if (selectedYears.length < 2) {
          setError('Veuillez sélectionner au moins 2 années pour la comparaison.')
          setLoading(false)
          return
        }

        const result = await apiService.compareYears(
          selectedYears,
          currentProvider,
          currentProvider === 'claude' ? apiKey : null,
          currentProvider === 'ollama' ? ollamaModel : null
        )
        setAnalysis({
          type: 'compare',
          years: selectedYears,
          text: result.analysis,
          data: result.comparison_data
        })
      }
    } catch (err) {
      console.error('Analysis error:', err)
      const errorMsg = err.response?.data?.error || err.message || 'Erreur lors de l\'analyse'
      setError(errorMsg)

      // If API key error, open config modal
      if (errorMsg.includes('clé API') || errorMsg.includes('API key')) {
        setShowConfigModal(true)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleConfigSave = ({ apiKey, provider: newProvider }) => {
    setProvider(newProvider)

    // Update configuration status
    if (newProvider === 'claude') {
      setHasConfig(!!apiKey)
    } else if (newProvider === 'ollama') {
      setHasConfig(true)
    }
  }

  return (
    <div className="ai-analysis-panel">
      <div className="panel-header">
        <h2>🤖 Analyse IA de vos finances</h2>
        <button
          className="btn btn-outline btn-sm"
          onClick={() => setShowConfigModal(true)}
        >
          ⚙️ Configuration
        </button>
      </div>

      {!hasConfig && provider === 'claude' && (
        <div className="warning-box">
          <strong>⚠️ Configuration requise</strong>
          <p>
            Vous devez configurer votre clé API Claude pour utiliser cette fonctionnalité.
          </p>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => setShowConfigModal(true)}
          >
            Configurer maintenant
          </button>
        </div>
      )}

      {provider === 'ollama' && (
        <div className="info-box" style={{ marginBottom: '1.5rem' }}>
          <strong>🔄 Utilisation d'Ollama (Local)</strong>
          <p>
            Les analyses sont effectuées localement avec le modèle {localStorage.getItem('ollama_model') || 'llama3.2:3b'}.
            Assurez-vous que le serveur Ollama est démarré (<code>ollama serve</code>).
          </p>
        </div>
      )}

      <div className="analysis-controls">
        {/* Mode Selection */}
        <div className="control-group">
          <label>Mode d'analyse :</label>
          <div className="radio-group">
            <label className="radio-label">
              <input
                type="radio"
                value="single"
                checked={analysisMode === 'single'}
                onChange={(e) => setAnalysisMode(e.target.value)}
              />
              <span>Analyser une année</span>
            </label>
            <label className="radio-label">
              <input
                type="radio"
                value="compare"
                checked={analysisMode === 'compare'}
                onChange={(e) => setAnalysisMode(e.target.value)}
              />
              <span>Comparer plusieurs années</span>
            </label>
          </div>
        </div>

        {/* Single Year Mode */}
        {analysisMode === 'single' && (
          <>
            <div className="control-group">
              <label htmlFor="year-select">Année à analyser :</label>
              <select
                id="year-select"
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="form-select"
              >
                {availableYears && availableYears.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>

            <div className="control-group">
              <label htmlFor="analysis-type">Type d'analyse :</label>
              <select
                id="analysis-type"
                value={analysisType}
                onChange={(e) => setAnalysisType(e.target.value)}
                className="form-select"
              >
                <option value="overview">Vue d'ensemble</option>
                <option value="recommendations">Recommandations</option>
                <option value="anomalies">Détection d'anomalies</option>
              </select>
            </div>
          </>
        )}

        {/* Multi-Year Mode */}
        {analysisMode === 'compare' && (
          <div className="control-group">
            <label>Années à comparer (min. 2) :</label>
            <div className="year-checkboxes">
              {availableYears && availableYears.map(year => (
                <label key={year} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={selectedYears.includes(year)}
                    onChange={() => handleYearToggle(year)}
                  />
                  <span>{year}</span>
                </label>
              ))}
            </div>
            {selectedYears.length > 0 && (
              <small className="form-hint">
                {selectedYears.length} année(s) sélectionnée(s) : {selectedYears.join(', ')}
              </small>
            )}
          </div>
        )}

        {/* Analyze Button */}
        <div className="control-group">
          <button
            className="btn btn-primary btn-lg"
            onClick={handleAnalyze}
            disabled={loading || !hasConfig || (analysisMode === 'compare' && selectedYears.length < 2)}
          >
            {loading ? (
              <>⏳ Analyse en cours...</>
            ) : (
              <>🤖 Analyser avec l'IA</>
            )}
          </button>
        </div>
      </div>

      {/* Loading Animation */}
      {loading && (
        <div className="ai-loading">
          <div className="brain-thinking">🧠</div>
          <p className="loading-text">
            L'IA analyse vos données financières...
            <br />
            <small>(Cela peut prendre jusqu'à 2 minutes sur CPU)</small>
          </p>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="error-box">
          <strong>❌ Erreur</strong>
          <p>{error}</p>
        </div>
      )}

      {/* Analysis Result */}
      {analysis && !loading && (
        <div className="analysis-result">
          <div className="result-header">
            <h3>
              {analysis.type === 'single'
                ? `📊 Analyse ${analysis.year} - ${
                    analysis.analysisType === 'overview' ? 'Vue d\'ensemble' :
                    analysis.analysisType === 'recommendations' ? 'Recommandations' :
                    'Détection d\'anomalies'
                  }`
                : `📈 Comparaison ${analysis.years.join(' vs ')}`
              }
            </h3>
            <button
              className="btn btn-outline btn-sm"
              onClick={() => setAnalysis(null)}
            >
              ✕ Fermer
            </button>
          </div>

          <div className="result-content markdown-content">
            <ReactMarkdown>{analysis.text}</ReactMarkdown>
          </div>

          {analysis.type === 'single' && analysis.data && (
            <div className="result-summary">
              <h4>Résumé des données</h4>
              <div className="summary-stats">
                <div className="stat-card">
                  <span className="stat-label">Dépenses totales</span>
                  <span className="stat-value">{analysis.data.total_expenses.toFixed(2)} €</span>
                </div>
                <div className="stat-card">
                  <span className="stat-label">Revenus totaux</span>
                  <span className="stat-value">{analysis.data.total_income.toFixed(2)} €</span>
                </div>
                <div className="stat-card">
                  <span className="stat-label">Solde net</span>
                  <span className={`stat-value ${analysis.data.net_balance >= 0 ? 'positive' : 'negative'}`}>
                    {analysis.data.net_balance.toFixed(2)} €
                  </span>
                </div>
                <div className="stat-card">
                  <span className="stat-label">Transactions</span>
                  <span className="stat-value">{analysis.data.transaction_count}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Config Modal */}
      <AIConfigModal
        show={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        onSave={handleConfigSave}
      />
    </div>
  )
}

export default AIAnalysisPanel
