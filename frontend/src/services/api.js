import axios from 'axios'

const API_BASE = '/api'

const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
})

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message)
    throw error
  }
)

export const apiService = {
  // Transactions
  async getTransactions(year = null) {
    const params = year ? { year } : {}
    console.log('API call getTransactions with params:', params, 'year:', year)
    const response = await api.get('/transactions', { params })
    console.log('API response:', response.data.data.length, 'transactions received')
    return response.data.data
  },

  async getTransaction(id) {
    const response = await api.get(`/transactions/${id}`)
    return response.data.data
  },

  async createTransaction(transactionData) {
    const response = await api.post('/transactions', transactionData)
    return response.data.data
  },

  async updateTransaction(id, transactionData) {
    const response = await api.put(`/transactions/${id}`, transactionData)
    return response.data.data
  },

  async deleteTransaction(id) {
    const response = await api.delete(`/transactions/${id}`)
    return response.data
  },

  // Categories
  async getCategories() {
    const response = await api.get('/categories')
    return response.data.data
  },

  async getCategory(id) {
    const response = await api.get(`/categories/${id}`)
    return response.data.data
  },

  async createCategory(categoryData) {
    const response = await api.post('/categories', categoryData)
    return response.data.data
  },

  async updateCategory(id, categoryData) {
    const response = await api.put(`/categories/${id}`, categoryData)
    return response.data.data
  },

  async deleteCategory(id) {
    const response = await api.delete(`/categories/${id}`)
    return response.data
  },

  // Categorization Rules
  async getCategorizationRules() {
    const response = await api.get('/categories/rules')
    return response.data.data
  },

  async createCategorizationRule(ruleData) {
    const response = await api.post('/categories/rules', ruleData)
    return response.data.data
  },

  async deleteCategorizationRule(id) {
    const response = await api.delete(`/categories/rules/${id}`)
    return response.data
  },

  // Subcategories
  async getSubcategories() {
    const response = await api.get('/subcategories')
    return response.data.data
  },

  async getSubcategoriesByCategory(categoryId) {
    const response = await api.get(`/categories/${categoryId}/subcategories`)
    return response.data.data
  },

  async createSubcategory(subcategoryData) {
    const response = await api.post('/subcategories', subcategoryData)
    return response.data.data
  },

  async updateSubcategory(id, subcategoryData) {
    const response = await api.put(`/subcategories/${id}`, subcategoryData)
    return response.data.data
  },

  async deleteSubcategory(id) {
    const response = await api.delete(`/subcategories/${id}`)
    return response.data
  },

  // Import
  async validateCsv(file, bankType = 'auto') {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('bank_type', bankType)
    const response = await api.post('/import/validate', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data.data
  },

  async importValidatedTransactions(transactions) {
    const response = await api.post('/import/validated', { transactions })
    return response.data.data
  },

  async previewCsv(file) {
    const formData = new FormData()
    formData.append('file', file)
    const response = await api.post('/import/preview', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data.data
  },

  async importCsv(file, bankType = 'auto') {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('bank_type', bankType)
    const response = await api.post('/import/csv', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data.data
  },

  // Stats
  async getAvailableYears() {
    const response = await api.get('/stats/years')
    return response.data.data
  },

  async getMonthlyStats(year) {
    const response = await api.get(`/stats/monthly/${year}`)
    return response.data.data
  },

  async getMonthlyStatsByCategory(year) {
    const response = await api.get(`/stats/monthly-by-category/${year}`)
    return response.data.data
  },

  async getCategoryStats(year) {
    const response = await api.get(`/stats/categories/${year}`)
    return response.data.data
  },

  async getSankeyData(year) {
    const response = await api.get(`/stats/sankey/${year}`)
    return response.data.data
  },

  async getYearSummary(year) {
    const response = await api.get(`/stats/summary/${year}`)
    return response.data.data
  },
}