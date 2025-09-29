# Tests API Budget Manager

Scripts de tests simples pour valider tous les endpoints de l'API Backend.

## Structure

```
test/
├── run_all_tests.sh         # Script principal pour lancer tous les tests
├── test_transactions.sh     # Tests des endpoints transactions
├── test_categories.sh       # Tests des endpoints catégories
├── test_import.sh          # Tests des endpoints d'import CSV
├── test_stats.sh           # Tests des endpoints de statistiques
├── data/
│   ├── test_import.csv     # Fichier CSV valide pour tests
│   └── test_import_invalid.csv # Fichier CSV avec erreurs
└── README.md               # Ce fichier
```

## Prérequis

1. **Serveur démarré** : Le backend Flask doit tourner sur `http://localhost:5000`
2. **jq installé** (optionnel) : Pour formater les réponses JSON
   ```bash
   sudo apt install jq
   ```

## Utilisation

### Lancer tous les tests
```bash
chmod +x test/run_all_tests.sh
./test/run_all_tests.sh
```

### Lancer un test spécifique
```bash
chmod +x test/test_transactions.sh
./test/test_transactions.sh
```

## Tests couverts

### 🔄 Transactions (`test_transactions.sh`)
- ✅ GET `/api/transactions` - Liste toutes les transactions
- ✅ POST `/api/transactions` - Créer une transaction
- ✅ GET `/api/transactions/{id}` - Récupérer une transaction
- ✅ PUT `/api/transactions/{id}` - Modifier une transaction
- ✅ DELETE `/api/transactions/{id}` - Supprimer une transaction
- ✅ Filtrage par année avec `?year=2025`
- ✅ Détection de doublons (hash)

### 🏷️ Catégories (`test_categories.sh`)
- ✅ GET `/api/categories` - Liste toutes les catégories
- ✅ POST `/api/categories` - Créer une catégorie
- ✅ GET `/api/categories/{id}` - Récupérer une catégorie
- ✅ PUT `/api/categories/{id}` - Modifier une catégorie
- ✅ DELETE `/api/categories/{id}` - Supprimer une catégorie
- ✅ GET `/api/categories/rules` - Liste des règles de catégorisation
- ✅ POST `/api/categories/rules` - Créer une règle
- ✅ DELETE `/api/categories/rules/{id}` - Supprimer une règle

### 📤 Import (`test_import.sh`)
- ✅ POST `/api/import/preview` - Prévisualiser un CSV
- ✅ POST `/api/import/csv` - Importer un CSV
- ✅ Gestion des doublons lors de l'import
- ✅ Validation des données (dates, montants)
- ✅ Gestion des erreurs (fichier invalide, données manquantes)

### 📊 Statistiques (`test_stats.sh`)
- ✅ GET `/api/stats/years` - Années disponibles
- ✅ GET `/api/stats/monthly/{year}` - Stats mensuelles
- ✅ GET `/api/stats/categories/{year}` - Stats par catégorie
- ✅ GET `/api/stats/summary/{year}` - Résumé annuel

## Format des réponses

Toutes les réponses API suivent le format :
```json
{
  "success": true,
  "data": { ... }
}
```

En cas d'erreur :
```json
{
  "success": false,
  "error": "Message d'erreur"
}
```

## Données de test

Les tests créent et manipulent des données temporaires :
- Transactions avec différentes catégories et dates
- Catégories personnalisées
- Règles de catégorisation
- Import de fichiers CSV avec données valides et invalides

Toutes les données créées pendant les tests sont nettoyées automatiquement.