import React, { useState, useEffect } from 'react'
import TransactionList from './components/TransactionList'
import ImportPanel from './components/ImportPanel'
import CategoryManager from './components/CategoryManager'
import MonthlyChart from './components/Charts/MonthlyChart'
import CategoryChart from './components/Charts/CategoryChart'
import YearSelector from './components/Charts/YearSelector'
import { apiService } from './services/api'

function App() {
  const [currentView, setCurrentView] = useState('transactions')
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [transactions, setTransactions] = useState([])
  const [categories, setCategories] = useState([])
  const [availableYears, setAvailableYears] = useState([])
  const [loading, setLoading] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  useEffect(() => {
    loadInitialData()
  }, [])

  useEffect(() => {
    if (currentView === 'transactions') {
      loadTransactions()
    }
  }, [selectedYear, currentView])

  const loadInitialData = async () => {
    try {
      setLoading(true)
      const [categoriesData, yearsData] = await Promise.all([
        apiService.getCategories(),
        apiService.getAvailableYears()
      ])
      setCategories(categoriesData)
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
      const data = await apiService.getTransactions(selectedYear)
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
            onUpdate={handleTransactionUpdate}
            loading={loading}
          />
        )
      case 'import':
        return (
          <ImportPanel
            onImportSuccess={handleImportSuccess}
          />
        )
      case 'categories':
        return (
          <CategoryManager
            categories={categories}
            onUpdate={handleCategoryUpdate}
          />
        )
      case 'stats':
        return (
          <div className="stats-container">
            <div className="charts-grid">
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
      default:
        return <TransactionList transactions={transactions} categories={categories} onUpdate={handleTransactionUpdate} />
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>💰 Budget Manager</h1>
        <div className="header-controls">
          <YearSelector
            years={availableYears}
            selectedYear={selectedYear}
            onYearChange={setSelectedYear}
          />
        </div>
      </header>

      <div className="app-body">
        <aside className={`app-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
          <div className="sidebar-header">
            <button
              className="sidebar-toggle"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              title={sidebarOpen ? 'Réduire le menu' : 'Ouvrir le menu'}
            >
              ☰
            </button>
          </div>
          <nav className="sidebar-nav">
            <button
              className={currentView === 'transactions' ? 'active' : ''}
              onClick={() => setCurrentView('transactions')}
            >
              <span className="nav-icon">📋</span>
              {sidebarOpen && <span className="nav-label">Transactions</span>}
            </button>
            <button
              className={currentView === 'import' ? 'active' : ''}
              onClick={() => setCurrentView('import')}
            >
              <span className="nav-icon">📤</span>
              {sidebarOpen && <span className="nav-label">Import CSV</span>}
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