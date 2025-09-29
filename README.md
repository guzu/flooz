# Budget Manager

Application web de gestion de budget personnel avec import CSV, catégorisation automatique et statistiques visuelles.

## 🌟 Fonctionnalités

- 📊 **Gestion des transactions** : CRUD complet avec édition inline
- 🏷️ **Catégorisation intelligente** : Règles automatiques basées sur le libellé
- 📤 **Import CSV** : Upload et détection de doublons avec hash SHA256
- 📈 **Statistiques** : Graphiques mensuels et répartition par catégorie
- 🎨 **Interface moderne** : React avec Recharts pour les visualisations

## 🏗️ Architecture

```
budget-manager/
├── backend/           # API Flask + SQLite
│   ├── models/        # Modèles de données
│   ├── services/      # Logique métier
│   ├── routes/        # Endpoints API
│   └── utils/         # Utilitaires (hash, etc.)
├── frontend/          # Interface React (à implémenter)
├── test/              # Scripts de tests API
└── data/              # Base SQLite (créée automatiquement)
```

## 🚀 Installation et démarrage

### Prérequis

- Python 3.8+
- pip/venv

### Backend (API)

```bash
# 1. Cloner et accéder au projet
cd budget/backend

# 2. Créer un environnement virtuel
python3 -m venv venv
source venv/bin/activate

# 3. Installer les dépendances
pip install -r requirements.txt

# 4. Démarrer le serveur
python app.py
```

Le serveur démarre sur **http://localhost:5000** avec l'API REST disponible.

### Base de données

La base SQLite est créée automatiquement au premier démarrage avec :
- Tables `transactions`, `categories`, `categorization_rules`
- Catégories par défaut (Alimentation, Transport, Logement, etc.)
- Règles de catégorisation pré-configurées

## 🧪 Tests

Valider le fonctionnement de l'API avec la suite de tests :

```bash
# Installer jq pour formater JSON (optionnel)
sudo apt install jq

# Lancer tous les tests
./test/run_all_tests.sh

# Ou tests spécifiques
./test/test_transactions.sh
./test/test_categories.sh
```

## 📡 API Endpoints

### Transactions
- `GET /api/transactions` - Liste des transactions
- `POST /api/transactions` - Créer une transaction
- `PUT /api/transactions/{id}` - Modifier une transaction
- `DELETE /api/transactions/{id}` - Supprimer une transaction

### Catégories
- `GET /api/categories` - Liste des catégories
- `POST /api/categories` - Créer une catégorie
- `GET /api/categories/rules` - Règles de catégorisation

### Import
- `POST /api/import/preview` - Prévisualiser un CSV
- `POST /api/import/csv` - Importer des transactions

### Statistiques
- `GET /api/stats/monthly/{year}` - Stats mensuelles
- `GET /api/stats/categories/{year}` - Répartition par catégorie
- `GET /api/stats/summary/{year}` - Résumé annuel

## 📄 Format CSV

```csv
date,label,amount,notes
2025-01-15,CARREFOUR PARIS,45.30,Courses alimentaires
2025-01-16,RATP NAVIGO,75.20,Transport mensuel
```

**Colonnes supportées :**
- `date` (requis) : YYYY-MM-DD ou DD/MM/YYYY
- `label` (requis) : Libellé de la transaction
- `amount` (requis) : Montant (positif pour dépenses)
- `notes` (optionnel) : Commentaires
- `category` (optionnel) : Nom de catégorie

## 🔧 Configuration

### Backend
- **Port** : 5000 (configurable dans `app.py`)
- **Base de données** : `data/budget.db` (SQLite)
- **CORS** : Activé pour développement frontend

### Détection de doublons
Hash SHA256 calculé sur `date + label + amount` pour éviter les imports multiples.

## 🛠️ Développement

### Structure du code

- **Modèles** : SQLite avec `sqlite3.Row` pour accès par nom
- **Services** : Logique métier séparée des routes
- **Routes** : Endpoints REST avec gestion d'erreurs
- **Tests** : Scripts bash avec curl pour validation complète

### Prochaines étapes

1. **Frontend React** : Interface utilisateur complète
2. **Docker** : Conteneurisation pour déploiement
3. **Authentification** : Gestion multi-utilisateurs
4. **Export** : PDF, Excel des statistiques

## 📝 License

MIT License