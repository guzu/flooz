import React from 'react'
import { useTranslation } from 'react-i18next'

const LanguageSwitcher = () => {
  const { i18n } = useTranslation()

  const languages = [
    { code: 'fr', label: '🇫🇷 Français', emoji: '🇫🇷' },
    { code: 'en', label: '🇬🇧 English', emoji: '🇬🇧' },
    { code: 'es', label: '🇪🇸 Español', emoji: '🇪🇸' },
  ]

  const handleLanguageChange = (langCode) => {
    i18n.changeLanguage(langCode)
  }

  return (
    <div className="language-switcher">
      <select
        value={i18n.language}
        onChange={(e) => handleLanguageChange(e.target.value)}
        className="language-select"
        title="Changer de langue / Change language / Cambiar idioma"
      >
        {languages.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.label}
          </option>
        ))}
      </select>
    </div>
  )
}

export default LanguageSwitcher
