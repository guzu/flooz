import React, { useState } from 'react'
import { apiService } from '../services/api'

const ImportPanel = ({ onImportSuccess }) => {
  const [selectedFile, setSelectedFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState(null)
  const [dragActive, setDragActive] = useState(false)

  const handleFileSelect = (file) => {
    if (file && file.type === 'text/csv') {
      setSelectedFile(file)
      setImportResult(null)
      loadPreview(file)
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

  const loadPreview = async (file) => {
    try {
      const previewData = await apiService.previewCsv(file)
      setPreview(previewData)
    } catch (error) {
      console.error('Error loading preview:', error)
      const errorMessage = error.response?.data?.error || error.message || 'Erreur lors du chargement de la prévisualisation'
      setPreview({
        error: errorMessage,
        details: error.response?.data
      })
    }
  }

  const handleImport = async () => {
    if (!selectedFile) return

    try {
      setImporting(true)
      const result = await apiService.importCsv(selectedFile)
      setImportResult(result)

      if (result.imported > 0) {
        onImportSuccess()
      }
    } catch (error) {
      console.error('Error importing CSV:', error)
      const errorMessage = error.response?.data?.error || error.message || 'Erreur lors de l\'import du fichier'
      const errorDetails = error.response?.data

      setImportResult({
        imported: 0,
        duplicates: 0,
        errors: errorDetails?.errors || [errorMessage],
        format: errorDetails?.format,
        success: false,
        httpError: error.response?.status,
        httpMessage: error.response?.statusText
      })
    } finally {
      setImporting(false)
    }
  }

  const clearFile = () => {
    setSelectedFile(null)
    setPreview(null)
    setImportResult(null)
    // Reset file input
    const fileInput = document.getElementById('csv-file-input')
    if (fileInput) fileInput.value = ''
  }

  const renderPreview = () => {
    if (!preview) return null

    if (preview.error) {
      return (
        <div className="preview-section error">
          <h3>❌ Erreur de prévisualisation</h3>
          <div className="error-message">
            <p><strong>Message :</strong> {preview.error}</p>
            {preview.details && (
              <div className="error-details-section">
                <h4>Détails techniques :</h4>
                <pre className="error-details-pre">
                  {JSON.stringify(preview.details, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )
    }

    return (
      <div className="preview-section">
        <h3>👁️ Prévisualisation</h3>
        <div className="preview-info">
          <p><strong>Fichier :</strong> {preview.filename}</p>
          <p><strong>Total de lignes :</strong> {preview.total_rows}</p>
          <p><strong>Colonnes détectées :</strong> {preview.headers?.join(', ')}</p>
          {preview.detected_format && (
            <p><strong>Format détecté :</strong> {preview.detected_format === 'bank' ? 'Format bancaire' : 'Format standard'}</p>
          )}
        </div>

        {preview.preview_rows && preview.preview_rows.length > 0 && (
          <div className="preview-table-container">
            <table className="preview-table">
              {preview.detected_format !== 'bank' && (
                <thead>
                  <tr>
                    {preview.headers.map((header, index) => (
                      <th key={index}>{header}</th>
                    ))}
                  </tr>
                </thead>
              )}
              <tbody>
                {preview.detected_format === 'bank' && preview.headers && (
                  <tr className="bank-header-row">
                    {preview.headers.map((header, index) => (
                      <td key={index} className="bank-header-cell">{header}</td>
                    ))}
                  </tr>
                )}
                {preview.preview_rows.map((row, index) => (
                  <tr key={index}>
                    {preview.headers.map((header, colIndex) => (
                      <td key={colIndex}>{row[header] || ''}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="preview-note">
              {preview.detected_format === 'bank'
                ? 'Prévisualisation : première ligne = en-têtes, lignes suivantes = données'
                : 'Prévisualisation des 5 premières lignes de données seulement'
              }
            </p>
          </div>
        )}
      </div>
    )
  }

  const renderImportResult = () => {
    if (!importResult) return null

    const hasErrors = importResult.errors && importResult.errors.length > 0
    const isHttpError = importResult.success === false && importResult.httpError

    return (
      <div className={`import-result ${hasErrors || isHttpError ? 'has-errors' : 'success'}`}>
        <h3>📊 Résultat de l'import</h3>

        {isHttpError && (
          <div className="http-error-section">
            <h4>❌ Erreur HTTP {importResult.httpError}</h4>
            <p><strong>Status :</strong> {importResult.httpMessage}</p>
            {importResult.errors && importResult.errors.length > 0 && (
              <div className="http-error-details">
                <strong>Message détaillé :</strong>
                <ul>
                  {importResult.errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

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

        {importResult.format && (
          <p className="format-detected">
            <strong>Format détecté :</strong> {importResult.format === 'bank' ? 'Format bancaire' : 'Format standard'}
          </p>
        )}

        {hasErrors && !isHttpError && (
          <div className="error-details">
            <h4>Détail des erreurs :</h4>
            <ul>
              {importResult.errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        {importResult.imported > 0 && (
          <p className="success-message">
            ✅ {importResult.imported} transaction(s) importée(s) avec succès !
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="import-panel">
      <div className="import-header">
        <h2>📤 Import de fichier CSV</h2>
        <p>Importez vos transactions depuis un fichier CSV (format bancaire ou standard)</p>
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

      <div className="format-info">
        <h4>📋 Formats supportés :</h4>
        <div className="format-examples">
          <div className="format-example">
            <h5>Format standard :</h5>
            <code>date,label,amount,notes</code>
          </div>
          <div className="format-example">
            <h5>Format bancaire :</h5>
            <code>Date;Bénéficiaire;Libellé;...;Débit;Crédit;...</code>
          </div>
        </div>
      </div>

      {renderPreview()}

      {selectedFile && !importing && (
        <div className="import-actions">
          <button
            onClick={handleImport}
            className="btn btn-success btn-large"
            disabled={!preview || preview.error}
          >
            🚀 Importer les transactions
          </button>
        </div>
      )}

      {importing && (
        <div className="importing">
          <p>⏳ Import en cours...</p>
          <div className="loading-spinner"></div>
        </div>
      )}

      {renderImportResult()}
    </div>
  )
}

export default ImportPanel