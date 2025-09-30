# Budget Manager

Application web de gestion de budget personnel avec import CSV, catégorisation automatique et statistiques visuelles.

## Fonctionnalités

- **Gestion des transactions** : CRUD complet avec sélection multiple et catégorisation en lot
- **Catégorisation intelligente** : Règles automatiques + actions manuelles sur sélections multiples
- **Import CSV** : Upload et détection de doublons avec hash SHA256
- **Statistiques** : Graphiques mensuels et répartition par catégorie avec sélecteur d'année
- **Interface moderne** : React avec raccourcis clavier et filtres avancés
- **Filtrage intelligent** : Recherche floue avec historique complet optionnel

## Architecture

```
budget-manager/
├── backend/           # API Flask + SQLite
│   ├── models/        # Modèles de données
│   ├── services/      # Logique métier
│   ├── routes/        # Endpoints API
│   └── utils/         # Utilitaires (hash, etc.)
├── frontend/          # Interface React + Vite
├── test/              # Scripts de tests API
└── data/              # Base SQLite (créée automatiquement)
```

## Installation et démarrage

### Prérequis

- Python 3.8+
- Node.js 18+ et npm
- pip/venv

### Installation rapide

```bash
# Installation automatique
./install.sh

# Démarrage
./start.sh
```

### Installation manuelle

#### Backend (API)

```bash
# 1. Cloner et accéder au projet
cd budget/backend

# 2. Créer un environnement virtuel
python3 -m venv venv
source venv/bin/activate

# 3. Installer les dépendances
pip install -r requirements.txt

# 4. Initialiser la base de données
python init_db.py

# 5. Démarrer le serveur
python app.py
```

Le serveur démarre sur **http://localhost:5000** avec l'API REST disponible.

### Frontend (Interface utilisateur)

```bash
# 1. Ouvrir un nouveau terminal et accéder au frontend
cd frontend

# 2. Installer les dépendances Node.js
npm install

# 3. Démarrer le serveur de développement
npm run dev
```

Le frontend se lance sur **http://localhost:3000** avec proxy automatique vers l'API backend.

### Démarrage complet de l'application

**Option 1 : Deux terminaux séparés**
```bash
# Terminal 1 - Backend
cd backend
source venv/bin/activate
python app.py

# Terminal 2 - Frontend
cd frontend
npm run dev
```

**Option 2 : Script automatique**
```bash
# Lancer les deux services avec un seul script
./start.sh
```

Le script `start.sh` démarre automatiquement le backend et le frontend, puis attend Ctrl+C pour les arrêter proprement.

## Gestion de la base de données

### Initialisation / Réinitialisation

```bash
cd backend
source venv/bin/activate

# Initialiser (crée si n'existe pas)
python init_db.py

# Réinitialiser (supprime et recrée)
python init_db.py --reset
```

La base de données est créée automatiquement au premier démarrage avec :
- 6 catégories par défaut (Alimentation, Transport, Logement, Santé, Loisirs, Non catégorisé)
- 23 sous-catégories pré-configurées
- 3 règles de catégorisation automatique

### Emplacement

La base SQLite est stockée dans `data/budget.db` et est exclue du contrôle de version (.gitignore).

## Déploiement Docker

### Prérequis Docker
- Docker Engine installé

### Conteneur unique

Approche tout-en-un avec Nginx + Flask dans le même conteneur.

```bash
# Option 1: Docker Compose (recommandé)
docker-compose up -d

# Option 2: Script automatique
./docker-start.sh

# Option 3: Commandes manuelles
docker build -t budget-manager .
docker run -d -p 80:80 -v $(pwd)/data:/app/data --name budget-manager budget-manager

# Commandes utiles
docker-compose logs -f    # Voir les logs
docker-compose down       # Arrêter l'application
docker-compose restart    # Redémarrer
```

**Application accessible sur:**
- Interface complète: http://localhost

### Gestion des données Docker

Les données de la base SQLite sont persistées via un volume Docker:
- **Volume local**: `./data/budget.db` monté dans le conteneur
- **Backup**: Copiez simplement le répertoire `./data/`
- **Restauration**: Replacez le fichier dans `./data/budget.db`

### Base de données

La base SQLite est créée automatiquement au premier démarrage avec :
- Tables `transactions`, `categories`, `categorization_rules`
- Catégories par défaut (Alimentation, Transport, Logement, etc.)
- Règles de catégorisation pré-configurées

## Tests

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

## API Endpoints

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

## Format CSV

### Format standard
```csv
date,label,amount,notes
2025-01-15,CARREFOUR PARIS,45.30,Courses alimentaires
2025-01-16,RATP NAVIGO,75.20,Transport mensuel
```

### Format bancaire (avec en-têtes)
```csv
Date;Bénéficiaire;Libellé;Référence;...;Débit;Crédit;...
24/09/2025;PICARD;PICARD 0738 FR VILLE;...;-29,08;;...
30/09/2025;VIREMENT;SALAIRE SEPTEMBRE;...;;2500,00;...
```

**Colonnes supportées (format standard) :**
- `date` (requis) : YYYY-MM-DD ou DD/MM/YYYY
- `label` (requis) : Libellé de la transaction
- `amount` (requis) : Montant (positif pour dépenses)
- `notes` (optionnel) : Commentaires
- `category` (optionnel) : Nom de catégorie

**Format bancaire :**
- Détection automatique du format (séparateur `;`)
- Support colonnes débit/crédit séparées
- Première ligne d'en-têtes ignorée automatiquement

## Configuration

### Backend
- **Port** : 5000 (configurable dans `app.py`)
- **Base de données** : `data/budget.db` (SQLite)
- **CORS** : Activé pour développement frontend

### Détection de doublons
Hash SHA256 calculé sur `date + label + amount` pour éviter les imports multiples.

## Développement

### Structure du code

- **Modèles** : SQLite avec `sqlite3.Row` pour accès par nom
- **Services** : Logique métier séparée des routes
- **Routes** : Endpoints REST avec gestion d'erreurs
- **Tests** : Scripts bash avec curl pour validation complète

### Fonctionnalités disponibles

✅ **Frontend React complet** : Interface utilisateur moderne et responsive avec sélection multiple
✅ **Import CSV intelligent** : Support formats bancaire et standard
✅ **Catégorisation automatique** : Règles configurables + actions manuelles en lot
✅ **Graphiques interactifs** : Recharts avec visualisations mensuelles et par catégorie
✅ **Raccourcis clavier** : Navigation rapide avec `/ ` (recherche), `Escape` (effacer), `?` (aide)
✅ **Filtrage avancé** : Recherche floue + option "Tout l'historique" pour voir toutes les années
✅ **Sélection multiple** : Ctrl/Shift + clic pour actions en lot (catégorisation groupée)
✅ **Gestion des catégories** : CRUD complet avec couleurs personnalisées et sous-catégories
✅ **Déploiement Docker** : Conteneurisation en conteneur unique

### Prochaines étapes possibles

1. **Authentification** : Gestion multi-utilisateurs
2. **Export** : PDF, Excel des statistiques
3. **Sauvegarde** : Backup automatique de la base de données
4. **API REST** : Documentation OpenAPI/Swagger

## License

MIT License