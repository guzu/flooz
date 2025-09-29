export const formatAmount = (amount) => {
  const absAmount = Math.abs(amount)
  const formatted = new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(absAmount)

  // Return with sign for income/expense indication
  return amount < 0 ? `+${formatted}` : `-${formatted}`
}

export const formatDate = (dateString) => {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('fr-FR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

export const formatDateForInput = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toISOString().split('T')[0]
}

export const getAmountColor = (amount) => {
  return amount < 0 ? '#10b981' : '#ef4444' // Green for income, red for expenses
}

export const getAmountSign = (amount) => {
  return amount < 0 ? '+' : '-'
}