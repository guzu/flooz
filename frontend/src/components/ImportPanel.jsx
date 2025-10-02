import React, { useState } from 'react'
import { apiService } from '../services/api'

const ImportPanel = ({ onImportSuccess, categories }) => {
  const [activeTab, setActiveTab] = useState('import')
  const [selectedFile, setSelectedFile] = useState(null)
  const [validation, setValidation] = useState(null)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState(null)
  const [dragActive, setDragActive] = useState(false)
  const [bankType, setBankType] = useState('auto')
  const [exporting, setExporting] = useState(false)

  const handleFileSelect = (file) => {
    if (file && file.type === 'text/csv') {
      setSelectedFile(file)
      setImportResult(null)
      setValidation(null)
      loadValidation(file)
    } else {
      alert('Veuillez sélectionner un fichier CSV valide')
    }
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    handleFileSelect(file)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const file = e.dataTransfer.files[0]
    handleFileSelect(file)
  }

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const loadValidation = async (file) => {
    try {
      const validationData = await apiService.validateCsv(file, bankType)
      setValidation(validationData)
    } catch (error) {
      console.error('Error loading validation:', error)
      const errorMessage = error.response?.data?.error || error.message || 'Erreur lors de la validation'
      setValidation({
        error: errorMessage,
        details: error.response?.data
      })
    }
  }

  const handleCategoryChange = (index, newCategoryId) => {
    if (!validation || !validation.transactions) return

    const updatedTransactions = [...validation.transactions]
    updatedTransactions[index] = {
      ...updatedTransactions[index],
      category_id: newCategoryId ? parseInt(newCategoryId) : null
    }

    setValidation({
      ...validation,
      transactions: updatedTransactions
    })
  }

  const handleToggleExclude = (index) => {
    if (!validation || !validation.transactions) return

    const updatedTransactions = [...validation.transactions]
    updatedTransactions[index] = {
      ...updatedTransactions[index],
      excluded: !updatedTransactions[index].excluded
    }

    setValidation({
      ...validation,
      transactions: updatedTransactions
    })
  }

  const handleImport = async () => {
    if (!validation || !validation.transactions) return

    try {
      setImporting(true)
      const result = await apiService.importValidatedTransactions(validation.transactions)
      setImportResult(result)

      if (result.imported > 0) {
        onImportSuccess()
      }
    } catch (error) {
      console.error('Error importing transactions:', error)
      const errorMessage = error.response?.data?.error || error.message || 'Erreur lors de l\'import'

      setImportResult({
        imported: 0,
        duplicates: 0,
        errors: [errorMessage],
        success: false
      })
    } finally {
      setImporting(false)
    }
  }

  const clearFile = () => {
    setSelectedFile(null)
    setValidation(null)
    setImportResult(null)
    const fileInput = document.getElementById('csv-file-input')
    if (fileInput) fileInput.value = ''
  }

  const getCategoryName = (categoryId) => {
    if (!categoryId) return 'Non catégorisé'
    const category = categories?.find(c => c.id === categoryId)
    return category ? category.name : 'Non catégorisé'
  }

  const getCategoryColor = (categoryId) => {
    if (!categoryId) return '#6b7280'
    const category = categories?.find(c => c.id === categoryId)
    return category ? category.color : '#6b7280'
  }

  const getImportStats = () => {
    if (!validation || !validation.transactions) return { total: 0, duplicates: 0, toImport: 0, excluded: 0 }

    const transactions = validation.transactions
    const duplicates = transactions.filter(t => t.is_duplicate).length
    const excluded = transactions.filter(t => t.excluded && !t.is_duplicate).length
    const toImport = transactions.length - duplicates - excluded

    return {
      total: transactions.length,
      duplicates,
      excluded,
      toImport
    }
  }

  const renderValidation = () => {
    if (!validation) return null

    if (validation.error) {
      return (
        <div className="validation-section error">
          <h3>❌ Erreur de validation</h3>
          <div className="error-message">
            <p><strong>Message :</strong> {validation.error}</p>
          </div>
        </div>
      )
    }

    const stats = getImportStats()
    const importSuccessful = importResult && importResult.imported > 0 && (!importResult.errors || importResult.errors.length === 0)

    return (
      <div className="validation-section">
        {importSuccessful && (
          <div className="import-success-banner">
            ✅ Import terminé avec succès ! {importResult.imported} transaction(s) importée(s).
          </div>
        )}
        <div className={`validation-content ${importSuccessful ? 'disabled' : ''}`}>
        <div className="validation-header">
          <h3>✅ Validation des transactions</h3>
          <div className="validation-stats">
            <span className="stat-badge total">{stats.total} total</span>
            <span className="stat-badge success">{stats.toImport} à importer</span>
            <span className="stat-badge warning">{stats.duplicates} doublons</span>
            {stats.excluded > 0 && <span className="stat-badge excluded">{stats.excluded} exclus</span>}
          </div>
        </div>

        {validation.errors && validation.errors.length > 0 && (
          <div className="validation-errors">
            <h4>⚠️ Erreurs de parsing ({validation.errors.length})</h4>
            <ul>
              {validation.errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="validation-table-container">
          <table className="validation-table">
            <thead>
              <tr>
                <th style={{ width: '80px' }}>Date</th>
                <th>Libellé</th>
                <th style={{ width: '100px' }}>Montant</th>
                <th style={{ width: '200px' }}>Catégorie</th>
                <th style={{ width: '100px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {validation.transactions.map((txn, index) => {
                const isDuplicate = txn.is_duplicate
                const isExcluded = txn.excluded
                const isInactive = isDuplicate || isExcluded

                return (
                  <tr
                    key={index}
                    className={`${isInactive ? 'inactive' : ''} ${isDuplicate ? 'duplicate' : ''} ${isExcluded ? 'excluded' : ''}`}
                  >
                    <td>{new Date(txn.date).toLocaleDateString('fr-FR')}</td>
                    <td>
                      {txn.label}
                      {isDuplicate && <span className="badge-duplicate">Doublon</span>}
                    </td>
                    <td className={txn.amount > 0 ? 'amount-expense' : 'amount-income'}>
                      {new Intl.NumberFormat('fr-FR', {
                        style: 'currency',
                        currency: 'EUR'
                      }).format(txn.amount)}
                    </td>
                    <td>
                      {!isDuplicate ? (
                        <select
                          value={txn.category_id || ''}
                          onChange={(e) => handleCategoryChange(index, e.target.value)}
                          className="category-select"
                          style={{
                            borderLeft: `3px solid ${getCategoryColor(txn.category_id)}`
                          }}
                          disabled={isExcluded}
                        >
                          <option value="">Non catégorisé</option>
                          {categories?.filter(c => c.name !== 'Non catégorisé').map(cat => (
                            <option key={cat.id} value={cat.id}>
                              {cat.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="category-badge-inactive">
                          {getCategoryName(txn.category_id)}
                        </span>
                      )}
                    </td>
                    <td>
                      {!isDuplicate && (
                        <button
                          onClick={() => handleToggleExclude(index)}
                          className={`btn-toggle-exclude ${isExcluded ? 'excluded' : ''}`}
                          title={isExcluded ? 'Réactiver' : 'Exclure'}
                        >
                          {isExcluded ? '✓' : '✕'}
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="import-actions">
          <button
            onClick={handleImport}
            disabled={importing || stats.toImport === 0 || importSuccessful}
            className="btn btn-primary btn-large"
          >
            {importing ? '⏳ Import en cours...' : `📥 Importer ${stats.toImport} transaction(s)`}
          </button>
          <button onClick={clearFile} className="btn btn-secondary">
            Annuler
          </button>
        </div>
        </div>
      </div>
    )
  }

  const renderImportResult = () => {
    if (!importResult) return null

    const hasErrors = importResult.errors && importResult.errors.length > 0
    const isHttpError = importResult.httpError

    // Ne pas afficher le panneau si l'import est réussi sans erreurs
    if (!hasErrors && !isHttpError && importResult.imported > 0) {
      return null
    }

    return (
      <div className={`import-result ${hasErrors || isHttpError ? 'has-errors' : 'success'}`}>
        <h3>📊 Résultat de l'import</h3>

        <div className="result-stats">
          <div className="stat-item success">
            <span className="stat-number">{importResult.imported || 0}</span>
            <span className="stat-label">Importées</span>
          </div>
          <div className="stat-item warning">
            <span className="stat-number">{importResult.duplicates || 0}</span>
            <span className="stat-label">Doublons ignorés</span>
          </div>
          <div className="stat-item error">
            <span className="stat-number">{importResult.errors?.length || 0}</span>
            <span className="stat-label">Erreurs</span>
          </div>
        </div>

        {hasErrors && (
          <div className="error-details">
            <h4>Détail des erreurs :</h4>
            <ul>
              {importResult.errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    )
  }

  const handleExportDatabase = async () => {
    try {
      setExporting(true)
      const response = await fetch('http://localhost:5000/api/export/database')
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `flooz-backup-${new Date().toISOString().split('T')[0]}.db`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Error exporting database:', error)
      alert('Erreur lors de l\'export de la base de données')
    } finally {
      setExporting(false)
    }
  }

  const handleExportJSON = async () => {
    try {
      setExporting(true)
      const response = await fetch('http://localhost:5000/api/export/json')
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `flooz-export-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Error exporting JSON:', error)
      alert('Erreur lors de l\'export JSON')
    } finally {
      setExporting(false)
    }
  }

  const renderExportPanel = () => {
    return (
      <div className="export-panel">
        <div className="export-section">
          <div className="export-card">
            <div className="export-card-icon">💾</div>
            <h3>Sauvegarde complète (Base de données)</h3>
            <p>Export binaire de la base de données SQLite. Idéal pour une sauvegarde complète et rapide.</p>
            <ul className="export-features">
              <li>✓ Fichier .db (format SQLite)</li>
              <li>✓ Toutes les données incluses</li>
              <li>✓ Restauration rapide</li>
              <li>✓ Taille optimale</li>
            </ul>
            <button
              onClick={handleExportDatabase}
              disabled={exporting}
              className="btn btn-primary btn-large"
            >
              {exporting ? '⏳ Export en cours...' : '💾 Exporter la base de données'}
            </button>
          </div>

          <div className="export-card">
            <div className="export-card-icon">📄</div>
            <h3>Export JSON</h3>
            <p>Export au format JSON lisible. Inclut toutes les transactions, catégories, sous-catégories et règles.</p>
            <ul className="export-features">
              <li>✓ Format JSON lisible</li>
              <li>✓ Compatible avec d'autres outils</li>
              <li>✓ Transactions complètes</li>
              <li>✓ Catégories et règles incluses</li>
            </ul>
            <button
              onClick={handleExportJSON}
              disabled={exporting}
              className="btn btn-primary btn-large"
            >
              {exporting ? '⏳ Export en cours...' : '📄 Exporter en JSON'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="import-panel">
      <div className="import-header">
        <h2>📥 Import / Export</h2>
        <p>Importez vos transactions ou exportez vos données</p>
      </div>

      <div className="import-tabs">
        <button
          className={`tab-button ${activeTab === 'import' ? 'active' : ''}`}
          onClick={() => setActiveTab('import')}
        >
          📥 Import
        </button>
        <button
          className={`tab-button ${activeTab === 'export' ? 'active' : ''}`}
          onClick={() => setActiveTab('export')}
        >
          📤 Export
        </button>
      </div>

      {activeTab === 'import' ? (
        <div className="tab-content">

      <div className="bank-type-selector">
        <label htmlFor="bank-type">Type de banque :</label>
        <select
          id="bank-type"
          value={bankType}
          onChange={(e) => setBankType(e.target.value)}
          className="bank-type-select"
        >
          <option value="auto">🔍 Détection automatique</option>
          <option value="boursorama">🏦 Boursorama</option>
          <option value="banque_populaire">🏦 Banque Populaire</option>
          <option value="standard">📄 Format standard (CSV avec en-têtes)</option>
        </select>
        <small className="bank-type-help">
          La détection automatique fonctionne dans la plupart des cas. Sélectionnez manuellement si nécessaire.
        </small>
      </div>

      <div
        className={`file-drop-zone ${dragActive ? 'active' : ''} ${selectedFile ? 'has-file' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDrag}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
      >
        {selectedFile ? (
          <div className="file-selected">
            <div className="file-info">
              <span className="file-icon">📄</span>
              <div className="file-details">
                <p className="file-name">{selectedFile.name}</p>
                <p className="file-size">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>
            <button onClick={clearFile} className="btn btn-secondary">
              Changer de fichier
            </button>
          </div>
        ) : (
          <div className="file-drop-content">
            <span className="drop-icon">📁</span>
            <p>Glissez-déposez votre fichier CSV ici</p>
            <p>ou</p>
            <label htmlFor="csv-file-input" className="btn btn-primary">
              Sélectionner un fichier
            </label>
            <input
              id="csv-file-input"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
          </div>
        )}
      </div>

      {renderValidation()}
      {renderImportResult()}
        </div>
      ) : (
        <div className="tab-content">
          {renderExportPanel()}
        </div>
      )}
    </div>
  )
}

export default ImportPanel