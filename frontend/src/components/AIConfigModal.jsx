import React, { useState, useEffect } from 'react'
import { apiService } from '../services/api'

const AIConfigModal = ({ show, onClose, onSave }) => {
  const [apiKey, setApiKey] = useState('')
  const [provider, setProvider] = useState('ollama')
  const [ollamaModel, setOllamaModel] = useState('llama3.2:3b')
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)
  const [testingModel, setTestingModel] = useState(false)
  const [modelTestResult, setModelTestResult] = useState(null)
  const [saving, setSaving] = useState(false)

  const ollamaModels = [
    { value: 'llama3.2:3b', label: 'Llama 3.2 (3B) - Recommandé', description: '~2GB, excellent sur CPU' },
    { value: 'phi3:mini', label: 'Phi-3 Mini (3.8B)', description: '~2.3GB, optimisé par Microsoft' },
    { value: 'gemma2:2b', label: 'Gemma 2 (2B)', description: '~1.5GB, ultra rapide' },
    { value: 'qwen2:1.5b', label: 'Qwen2 (1.5B)', description: '~1GB, le plus léger' },
  ]

  useEffect(() => {
    // Load saved configuration from localStorage
    const savedKey = localStorage.getItem('anthropic_api_key')
    const savedProvider = localStorage.getItem('ai_provider') || 'ollama'
    const savedModel = localStorage.getItem('ollama_model') || 'llama3.2:3b'
    if (savedKey) {
      setApiKey(savedKey)
    }
    setProvider(savedProvider)
    setOllamaModel(savedModel)

    // Reset test results when modal opens
    if (show) {
      setTestResult(null)
      setModelTestResult(null)
    }
  }, [show])

  // Reset test results when provider changes
  useEffect(() => {
    setTestResult(null)
    setModelTestResult(null)
  }, [provider])

  const handleTestConnection = async () => {
    if (provider === 'claude' && !apiKey.trim()) {
      setTestResult({ success: false, message: 'Veuillez entrer une clé API' })
      return
    }

    setTesting(true)
    setTestResult(null)

    try {
      const result = await apiService.testAPIKey(
        provider === 'claude' ? apiKey.trim() : null,
        provider,
        provider === 'ollama' ? ollamaModel : null
      )
      if (result.success) {
        setTestResult({
          success: true,
          message: provider === 'claude'
            ? '✅ Clé API valide !'
            : `✅ Ollama connecté ! Modèle ${ollamaModel} disponible.`
        })
      } else {
        setTestResult({ success: false, message: `❌ ${result.error}` })
      }
    } catch (error) {
      setTestResult({ success: false, message: `❌ Erreur: ${error.response?.data?.error || error.message}` })
    } finally {
      setTesting(false)
    }
  }

  const handleTestModel = async () => {
    if (provider === 'claude' && !apiKey.trim()) {
      setModelTestResult({ success: false, message: 'Veuillez entrer une clé API' })
      return
    }

    setTestingModel(true)
    setModelTestResult(null)

    try {
      const result = await apiService.testModel(
        provider,
        provider === 'ollama' ? ollamaModel : null,
        provider === 'claude' ? apiKey.trim() : null
      )
      if (result.success) {
        setModelTestResult({
          success: true,
          prompt: result.data.prompt,
          response: result.data.response
        })
      } else {
        setModelTestResult({ success: false, message: `❌ ${result.error}` })
      }
    } catch (error) {
      setModelTestResult({
        success: false,
        message: `❌ Erreur: ${error.response?.data?.error || error.message}`
      })
    } finally {
      setTestingModel(false)
    }
  }

  const handleSave = () => {
    setSaving(true)

    // Save to localStorage
    localStorage.setItem('ai_provider', provider)

    if (provider === 'claude') {
      if (apiKey.trim()) {
        localStorage.setItem('anthropic_api_key', apiKey.trim())
      } else {
        localStorage.removeItem('anthropic_api_key')
      }
    } else if (provider === 'ollama') {
      localStorage.setItem('ollama_model', ollamaModel)
    }

    setSaving(false)

    if (onSave) {
      onSave({ apiKey: apiKey.trim(), provider, ollamaModel })
    }

    onClose()
  }

  const handleClear = () => {
    setApiKey('')
    localStorage.removeItem('anthropic_api_key')
    setTestResult(null)
  }

  if (!show) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content ai-config-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>⚙️ Configuration de l'analyse IA</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label htmlFor="provider">Provider IA :</label>
            <select
              id="provider"
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="form-select"
            >
              <option value="ollama">Ollama (Local, Gratuit)</option>
              <option value="claude">Claude (Anthropic, Payant)</option>
            </select>
            <small className="form-hint">
              {provider === 'ollama'
                ? 'Ollama vous permet d\'utiliser des modèles IA localement, sans clé API et gratuitement.'
                : 'Claude nécessite une clé API Anthropic (payant à l\'usage).'
              }
            </small>
          </div>

          {provider === 'ollama' && (
            <>
              <div className="form-group">
                <label htmlFor="ollama-model">Modèle Ollama :</label>
                <select
                  id="ollama-model"
                  value={ollamaModel}
                  onChange={(e) => setOllamaModel(e.target.value)}
                  className="form-select"
                >
                  {ollamaModels.map(model => (
                    <option key={model.value} value={model.value}>
                      {model.label}
                    </option>
                  ))}
                </select>
                <small className="form-hint">
                  {ollamaModels.find(m => m.value === ollamaModel)?.description}
                  <br />
                  Si le modèle n'est pas installé : <code>ollama pull {ollamaModel}</code>
                </small>
              </div>

              <div className="form-actions">
                <button
                  className="btn btn-outline btn-sm"
                  onClick={handleTestConnection}
                  disabled={testing || testingModel}
                >
                  {testing ? 'Test en cours...' : '🔌 Tester la connexion'}
                </button>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleTestModel}
                  disabled={testing || testingModel}
                >
                  {testingModel ? '🧠 Test en cours...' : '🧠 Tester le modèle'}
                </button>
              </div>

              {testResult && (
                <div className={`test-result ${testResult.success ? 'success' : 'error'}`}>
                  {testResult.message}
                </div>
              )}

              {modelTestResult && (
                <div className={`test-result ${modelTestResult.success ? 'success' : 'error'}`}>
                  {modelTestResult.success ? (
                    <>
                      <strong>✅ Modèle fonctionnel !</strong>
                      <p style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
                        <strong>Question :</strong> {modelTestResult.prompt}
                      </p>
                      <p style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
                        <strong>Réponse :</strong> {modelTestResult.response}
                      </p>
                    </>
                  ) : (
                    modelTestResult.message
                  )}
                </div>
              )}

              <div className="info-box">
                <strong>📦 Installation Ollama :</strong>
                <p>
                  1. Installez Ollama depuis{' '}
                  <a href="https://ollama.com/download" target="_blank" rel="noopener noreferrer">
                    ollama.com/download
                  </a>
                  <br />
                  2. Téléchargez un modèle : <code>ollama pull {ollamaModel}</code>
                  <br />
                  3. Démarrez le serveur : <code>ollama serve</code>
                </p>
              </div>
            </>
          )}

          {provider === 'claude' && (
            <>
              <div className="form-group">
                <label htmlFor="api-key">Clé API Claude :</label>
                <input
                  id="api-key"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-ant-..."
                  className="form-input"
                />
                <small className="form-hint">
                  Obtenez votre clé API sur{' '}
                  <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer">
                    console.anthropic.com
                  </a>
                </small>
              </div>

              <div className="form-actions">
                <button
                  className="btn btn-outline btn-sm"
                  onClick={handleTestConnection}
                  disabled={testing || testingModel || !apiKey.trim()}
                >
                  {testing ? 'Test en cours...' : '🧪 Tester la clé'}
                </button>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleTestModel}
                  disabled={testing || testingModel || !apiKey.trim()}
                >
                  {testingModel ? '🧠 Test en cours...' : '🧠 Tester le modèle'}
                </button>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={handleClear}
                  disabled={!apiKey.trim()}
                >
                  🗑️ Effacer
                </button>
              </div>

              {testResult && (
                <div className={`test-result ${testResult.success ? 'success' : 'error'}`}>
                  {testResult.message}
                </div>
              )}

              {modelTestResult && (
                <div className={`test-result ${modelTestResult.success ? 'success' : 'error'}`}>
                  {modelTestResult.success ? (
                    <>
                      <strong>✅ Modèle fonctionnel !</strong>
                      <p style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
                        <strong>Question :</strong> {modelTestResult.prompt}
                      </p>
                      <p style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
                        <strong>Réponse :</strong> {modelTestResult.response}
                      </p>
                    </>
                  ) : (
                    modelTestResult.message
                  )}
                </div>
              )}
            </>
          )}

          {provider === 'claude' && (
            <div className="info-box">
              <strong>ℹ️ Confidentialité :</strong>
              <p>
                Votre clé API est stockée localement dans votre navigateur et envoyée uniquement lors des
                analyses. Vos données financières sont envoyées à l'API Claude pour analyse.
              </p>
            </div>
          )}

          {provider === 'ollama' && (
            <div className="info-box">
              <strong>🔒 100% Local et Privé :</strong>
              <p>
                Avec Ollama, toutes les analyses sont effectuées localement sur votre machine.
                Aucune donnée n'est jamais envoyée à des serveurs externes. Confidentialité totale garantie.
              </p>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>
            Annuler
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving || (provider === 'claude' && !apiKey.trim())}
          >
            {saving ? 'Enregistrement...' : '💾 Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default AIConfigModal
