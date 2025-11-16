import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

// Import JSON files directly from src/locales
import commonFr from './locales/fr/common.json'
import commonEn from './locales/en/common.json'
import commonEs from './locales/es/common.json'
import chartsFr from './locales/fr/charts.json'
import chartsEn from './locales/en/charts.json'
import chartsEs from './locales/es/charts.json'
import transactionsFr from './locales/fr/transactions.json'
import transactionsEn from './locales/en/transactions.json'
import transactionsEs from './locales/es/transactions.json'
import categoriesFr from './locales/fr/categories.json'
import categoriesEn from './locales/en/categories.json'
import categoriesEs from './locales/es/categories.json'

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'fr',
    supportedLngs: ['fr', 'en', 'es'],
    defaultNS: 'common',
    ns: ['common', 'charts', 'transactions', 'categories'],

    interpolation: {
      escapeValue: false, // React already escapes
    },

    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'flooz_language',
    },

    resources: {
      fr: {
        common: commonFr,
        charts: chartsFr,
        transactions: transactionsFr,
        categories: categoriesFr,
      },
      en: {
        common: commonEn,
        charts: chartsEn,
        transactions: transactionsEn,
        categories: categoriesEn,
      },
      es: {
        common: commonEs,
        charts: chartsEs,
        transactions: transactionsEs,
        categories: categoriesEs,
      },
    },
  })

export default i18n
