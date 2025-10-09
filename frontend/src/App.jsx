import React, { useState, useEffect } from 'react'
import TransactionList from './components/TransactionList'
import ImportPanel from './components/ImportPanel'
import CategoryManager from './components/CategoryManager'
import RulesManager from './components/RulesManager'
import MonthlyChart from './components/Charts/MonthlyChart'
import CategoryChart from './components/Charts/CategoryChart'
import SankeyChart from './components/Charts/SankeyChart'
import YearSelector from './components/Charts/YearSelector'
import ComparisonView from './components/ComparisonView'
import AIAnalysisPanel from './components/AIAnalysisPanel'
import { apiService } from './services/api'

function App() {
  const [currentView, setCurrentView] = useState('transactions')
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [transactions, setTransactions] = useState([])
  const [categories, setCategories] = useState([])
  const [subcategories, setSubcategories] = useState([])
  const [availableYears, setAvailableYears] = useState([])
  const [loading, setLoading] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [showAllHistory, setShowAllHistory] = useState(false)

  useEffect(() => {
    loadInitialData()
  }, [])

  useEffect(() => {
    if (currentView === 'transactions') {
      loadTransactions()
    }
  }, [selectedYear, currentView, showAllHistory])

  const loadInitialData = async () => {
    try {
      setLoading(true)
      const [categoriesData, subcategoriesData, yearsData] = await Promise.all([
        apiService.getCategories(),
        apiService.getSubcategories(),
        apiService.getAvailableYears()
      ])
      setCategories(categoriesData)
      setSubcategories(subcategoriesData)
      setAvailableYears(yearsData)
    } catch (error) {
      console.error('Error loading initial data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadTransactions = async () => {
    try {
      setLoading(true)
      console.log('Loading transactions with showAllHistory:', showAllHistory, 'selectedYear:', selectedYear)
      const yearParam = showAllHistory ? null : selectedYear
      console.log('API call with year parameter:', yearParam)
      const data = await apiService.getTransactions(yearParam)
      console.log('Received', data.length, 'transactions')
      setTransactions(data)
    } catch (error) {
      console.error('Error loading transactions:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleImportSuccess = () => {
    loadTransactions()
    // Refresh available years in case new year was added
    apiService.getAvailableYears().then(setAvailableYears)
  }

  const handleTransactionUpdate = () => {
    loadTransactions()
  }

  const handleCategoryUpdate = () => {
    loadInitialData() // Reload both categories and transactions
    loadTransactions()
  }

  const renderContent = () => {
    switch (currentView) {
      case 'transactions':
        return (
          <TransactionList
            transactions={transactions}
            categories={categories}
            subcategories={subcategories}
            onUpdate={handleTransactionUpdate}
            loading={loading}
            availableYears={availableYears}
            selectedYear={selectedYear}
            onYearChange={setSelectedYear}
            onLoadAllTransactions={(showAll) => setShowAllHistory(showAll)}
          />
        )
      case 'import':
        return (
          <ImportPanel
            onImportSuccess={handleImportSuccess}
            categories={categories}
          />
        )
      case 'categories':
        return (
          <CategoryManager
            categories={categories}
            onUpdate={handleCategoryUpdate}
          />
        )
      case 'rules':
        return (
          <RulesManager
            categories={categories}
          />
        )
      case 'stats':
        return (
          <div className="stats-container">
            <div className="stats-header">
              <h2>Statistiques</h2>
            </div>
            <YearSelector
              years={availableYears}
              selectedYear={selectedYear}
              onYearChange={setSelectedYear}
              variant="buttons"
            />
            <div className="charts-grid">
              <div className="chart-section chart-section-full">
                <h3>Flux des dépenses (Catégories → Sous-catégories)</h3>
                <SankeyChart year={selectedYear} />
              </div>
              <div className="chart-section">
                <h3>Dépenses mensuelles</h3>
                <MonthlyChart year={selectedYear} />
              </div>
              <div className="chart-section">
                <h3>Répartition par catégorie</h3>
                <CategoryChart year={selectedYear} />
              </div>
            </div>
          </div>
        )
      case 'comparison':
        return (
          <ComparisonView availableYears={availableYears} />
        )
      case 'ai-analysis':
        return (
          <AIAnalysisPanel availableYears={availableYears} />
        )
      default:
        return (
          <TransactionList
            transactions={transactions}
            categories={categories}
            subcategories={subcategories}
            onUpdate={handleTransactionUpdate}
            loading={loading}
            availableYears={availableYears}
            selectedYear={selectedYear}
            onYearChange={setSelectedYear}
            onLoadAllTransactions={(showAll) => setShowAllHistory(showAll)}
          />
        )
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <img src="/banner-app.png" alt="Flooz" className="app-logo" />
        <a
          href="https://github.com/guzu/flooz"
          target="_blank"
          rel="noopener noreferrer"
          className="github-link"
          title="Voir le code source sur GitHub"
        >
          <svg height="20" viewBox="0 0 16 16" width="20" fill="currentColor">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
          </svg>
        </a>
      </header>

      <div className="app-body">
        <aside className={`app-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
          <div className="sidebar-header">
            <button
              className="sidebar-toggle"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              title={sidebarOpen ? 'Réduire le menu' : 'Ouvrir le menu'}
            >
              {sidebarOpen ? (
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <line x1="9" y1="3" x2="9" y2="21"/>
                  <path d="M17 16l-4-4 4-4"/>
                </svg>
              ) : (
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <line x1="9" y1="3" x2="9" y2="21"/>
                  <path d="M13 8l4 4-4 4"/>
                </svg>
              )}
            </button>
          </div>
          <nav className="sidebar-nav">
            <div className="nav-main">
              <button
                className={currentView === 'transactions' ? 'active' : ''}
                onClick={() => setCurrentView('transactions')}
              >
                <span className="nav-icon">📋</span>
                {sidebarOpen && <span className="nav-label">Transactions</span>}
              </button>
              <button
                className={currentView === 'categories' ? 'active' : ''}
                onClick={() => setCurrentView('categories')}
              >
                <span className="nav-icon">🏷️</span>
                {sidebarOpen && <span className="nav-label">Catégories</span>}
              </button>
              <button
                className={currentView === 'stats' ? 'active' : ''}
                onClick={() => setCurrentView('stats')}
              >
                <span className="nav-icon">📊</span>
                {sidebarOpen && <span className="nav-label">Statistiques</span>}
              </button>
              <button
                className={currentView === 'comparison' ? 'active' : ''}
                onClick={() => setCurrentView('comparison')}
              >
                <span className="nav-icon">📈</span>
                {sidebarOpen && <span className="nav-label">Comparaison</span>}
              </button>
              <button
                className={currentView === 'ai-analysis' ? 'active' : ''}
                onClick={() => setCurrentView('ai-analysis')}
              >
                <span className="nav-icon">🤖</span>
                {sidebarOpen && <span className="nav-label">Analyse IA</span>}
              </button>
            </div>
            <div className="nav-admin">
              <button
                className={currentView === 'import' ? 'active' : ''}
                onClick={() => setCurrentView('import')}
              >
                <span className="nav-icon">📥</span>
                {sidebarOpen && <span className="nav-label">Import / Export</span>}
              </button>
            </div>
            <div className="sidebar-footer">
              {sidebarOpen && (
                <>
                  Made with ❤️ using{' '}
                  <svg
                    className="claude-logo"
                    width="14"
                    height="14"
                    viewBox="0 0 512 509.64"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path fill="#D77655" d="M115.612 0h280.775C459.974 0 512 52.026 512 115.612v278.415c0 63.587-52.026 115.612-115.613 115.612H115.612C52.026 509.639 0 457.614 0 394.027V115.612C0 52.026 52.026 0 115.612 0z"/>
                    <path fill="#FCF2EE" fillRule="nonzero" d="M142.27 316.619l73.655-41.326 1.238-3.589-1.238-1.996-3.589-.001-12.31-.759-42.084-1.138-36.498-1.516-35.361-1.896-8.897-1.895-8.34-10.995.859-5.484 7.482-5.03 10.717.935 23.683 1.617 35.537 2.452 25.782 1.517 38.193 3.968h6.064l.86-2.451-2.073-1.517-1.618-1.517-36.776-24.922-39.81-26.338-20.852-15.166-11.273-7.683-5.687-7.204-2.451-15.721 10.237-11.273 13.75.935 3.513.936 13.928 10.716 29.749 23.027 38.848 28.612 5.687 4.727 2.275-1.617.278-1.138-2.553-4.271-21.13-38.193-22.546-38.848-10.035-16.101-2.654-9.655c-.935-3.968-1.617-7.304-1.617-11.374l11.652-15.823 6.445-2.073 15.545 2.073 6.547 5.687 9.655 22.092 15.646 34.78 24.265 47.291 7.103 14.028 3.791 12.992 1.416 3.968 2.449-.001v-2.275l1.997-26.641 3.69-32.707 3.589-42.084 1.239-11.854 5.863-14.206 11.652-7.683 9.099 4.348 7.482 10.716-1.036 6.926-4.449 28.915-8.72 45.294-5.687 30.331h3.313l3.792-3.791 15.342-20.372 25.782-32.227 11.374-12.789 13.27-14.129 8.517-6.724 16.1-.001 11.854 17.617-5.307 18.199-16.581 21.029-13.75 17.819-19.716 26.54-12.309 21.231 1.138 1.694 2.932-.278 44.536-9.479 24.062-4.347 28.714-4.928 12.992 6.066 1.416 6.167-5.106 12.613-30.71 7.583-36.018 7.204-53.636 12.689-.657.48.758.935 24.164 2.275 10.337.556h25.301l47.114 3.514 12.309 8.139 7.381 9.959-1.238 7.583-18.957 9.655-25.579-6.066-59.702-14.205-20.474-5.106-2.83-.001v1.694l17.061 16.682 31.266 28.233 39.152 36.397 1.997 8.999-5.03 7.102-5.307-.758-34.401-25.883-13.27-11.651-30.053-25.302-1.996-.001v2.654l6.926 10.136 36.574 54.975 1.895 16.859-2.653 5.485-9.479 3.311-10.414-1.895-21.408-30.054-22.092-33.844-17.819-30.331-2.173 1.238-10.515 113.261-4.929 5.788-11.374 4.348-9.478-7.204-5.03-11.652 5.03-23.027 6.066-30.052 4.928-23.886 4.449-29.674 2.654-9.858-.177-.657-2.173.278-22.37 30.71-34.021 45.977-26.919 28.815-6.445 2.553-11.173-5.789 1.037-10.337 6.243-9.2 37.257-47.392 22.47-29.371 14.508-16.961-.101-2.451h-.859l-98.954 64.251-17.618 2.275-7.583-7.103.936-11.652 3.589-3.791 29.749-20.474-.101.102.024.101z"/>
                  </svg>
                </>
              )}
            </div>
          </nav>
        </aside>

        <main className="app-main">
          {renderContent()}
        </main>
      </div>
    </div>
  )
}

export default App
