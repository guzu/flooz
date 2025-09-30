# Budget Manager - Structure du Projet

```
budget-manager/
│
├── backend/
│   ├── app.py                      # Point d'entrée Flask
│   ├── config.py                   # Configuration (DB path, etc.)
│   ├── requirements.txt            # Dépendances Python
│   │
│   ├── models/
│   │   ├── __init__.py
│   │   ├── database.py            # Connexion SQLite
│   │   └── transaction.py         # Modèle Transaction
│   │
│   ├── services/
│   │   ├── __init__.py
│   │   ├── import_service.py      # Import CSV + détection doublons
│   │   ├── category_service.py    # Gestion catégories & règles
│   │   └── stats_service.py       # Calculs pour graphiques
│   │
│   ├── routes/
│   │   ├── __init__.py
│   │   ├── transactions.py        # CRUD transactions
│   │   ├── categories.py          # CRUD catégories
│   │   ├── import_routes.py       # Import fichiers
│   │   └── stats.py               # Stats pour graphiques
│   │
│   └── utils/
│       ├── __init__.py
│       └── hash_utils.py          # Hash pour détection doublons
│
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   │
│   ├── src/
│   │   ├── main.jsx               # Point d'entrée React
│   │   ├── App.jsx                # Composant principal
│   │   │
│   │   ├── components/
│   │   │   ├── TransactionList.jsx      # Liste avec sélection multiple et filtres
│   │   │   ├── TransactionRow.jsx       # Ligne avec catégorisation
│   │   │   ├── ImportPanel.jsx          # Upload CSV
│   │   │   ├── CategoryManager.jsx      # Gestion catégories
│   │   │   ├── RulesManager.jsx         # Gestion règles catégorisation
│   │   │   └── Charts/
│   │   │       ├── MonthlyChart.jsx     # Graph par mois
│   │   │       ├── CategoryChart.jsx    # Graph par catégorie
│   │   │       └── YearSelector.jsx     # Sélecteur année
│   │   │
│   │   ├── services/
│   │   │   └── api.js             # Appels API backend
│   │   │
│   │   ├── styles/
│   │   │   └── App.css            # Styles globaux
│   │   │
│   │   └── utils/
│   │       └── formatters.js      # Formatage dates/montants
│   │
│   └── public/
│       └── sample_import.csv      # Exemple fichier CSV
│
├── data/
│   └── budget.db                  # Base SQLite (créée au démarrage)
│
├── CLAUDE.md                      # Guide pour Claude Code
├── README.md                      # Documentation projet
└── docker-compose.yml             # (optionnel) Pour déploiement
```

## Schéma Base de Données SQLite

### Table: transactions
```sql
CREATE TABLE transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date DATE NOT NULL,
    label TEXT NOT NULL,
    amount REAL NOT NULL,
    category_id INTEGER,
    hash TEXT UNIQUE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id)
);

CREATE INDEX idx_date ON transactions(date);
CREATE INDEX idx_hash ON transactions(hash);
CREATE INDEX idx_category ON transactions(category_id);
```

### Table: categories
```sql
CREATE TABLE categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    color TEXT NOT NULL,
    icon TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Catégories par défaut
INSERT INTO categories (name, color) VALUES 
    ('Alimentation', '#10b981'),
    ('Transport', '#3b82f6'),
    ('Logement', '#8b5cf6'),
    ('Santé', '#ef4444'),
    ('Loisirs', '#f59e0b'),
    ('Non catégorisé', '#6b7280');
```

### Table: categorization_rules
```sql
CREATE TABLE categorization_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pattern TEXT NOT NULL,
    category_id INTEGER NOT NULL,
    priority INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- Exemples de règles
INSERT INTO categorization_rules (pattern, category_id, priority) VALUES 
    ('CARREFOUR|AUCHAN|LECLERC', 1, 10),
    ('SNCF|RATP|ESSENCE', 2, 10),
    ('LOYER|EDF|EAU', 3, 10);
```

## Démarrage de l'Application

### 1. Backend (Python Flask)
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Linux/Mac
# ou venv\Scripts\activate  # Windows
pip install -r requirements.txt
python app.py
```
Serveur disponible sur : http://localhost:5000

### 2. Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev
```
Application disponible sur : http://localhost:5173

### Dependencies

#### Backend (requirements.txt)
```
Flask==3.0.0
Flask-CORS==4.0.0
python-dotenv==1.0.0
```

#### Frontend (package.json - dépendances clés)
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "recharts": "^2.10.0",
    "axios": "^1.6.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.0.3",
    "vite": "^4.4.5"
  }
}
```

## Formats CSV Supportés

### Format Standard
```csv
date,label,amount,category,notes
2025-01-15,CARREFOUR PARIS,45.30,Alimentation,Courses hebdomadaires
2025-01-16,RATP NAVIGO,75.20,Transport,
2025-01-20,LOYER JANVIER,1200.00,Logement,
```

**Colonnes supportées :**
- `date` (requis) : Format YYYY-MM-DD ou DD/MM/YYYY
- `label` (requis) : Libellé de la transaction
- `amount` (requis) : Montant (positif pour dépenses)
- `category` (optionnel) : Nom de catégorie
- `notes` (optionnel) : Notes complémentaires

### Format Bancaire (détection automatique)
```csv
Date;Bénéficiaire;Libellé;Référence;Valeur;Montant;Devise;Débit;Crédit;Cumul
15/01/2025;CARREFOUR;ACHAT CARREFOUR PARIS;REF123;15/01/2025;-45,30;EUR;45,30;;1500,00
16/01/2025;RATP;NAVIGO MENSUEL;REF124;16/01/2025;-75,20;EUR;75,20;;1424,80
```

**Caractéristiques du format bancaire :**
- Séparateur : point-virgule (`;`)
- Première ligne : en-têtes (ignorée automatiquement)
- Colonnes débit/crédit dans les positions 8 et 9
- Détection automatique du format basée sur la structure

## Points Clés Architecture

### Détection Doublons
Hash calculé : `SHA256(date + label + amount)`
- À l'import, vérification de l'existence du hash
- Si existe : transaction ignorée
- Si nouveau : insertion

### Interface Utilisateur

#### Navigation Sidebar
- **Panneau rétractable** avec bouton toggle hamburger (☰)
- **5 sections** : Transactions, Catégories, Statistiques, Import CSV, Règles
- **Icônes émojis** pour chaque section
- **Animation fluide** d'ouverture/fermeture avec rotation du bouton

#### Gestion des Transactions
- **Sélection multiple** avec Ctrl/Shift + clic pour sélectionner plusieurs transactions
- **Feedback visuel** : transactions sélectionnées en surbrillance bleue
- **Menu contextuel** (clic droit) avec actions conditionnelles
- **Catégorisation en lot** via modal avec dropdown catégorie/sous-catégorie
- **Actions individuelles** : catégoriser, filtrer, supprimer

#### Filtrage et Recherche
- **Filtre intelligent** avec algorithme de distance de Levenshtein
- **Option historique complet** via checkbox "Tout l'historique"
- **Champ de recherche** avec taille fixe (350px)
- **Tri par colonnes** (date, label, montant, catégorie)

#### Raccourcis Clavier
- **`/`** : Focus sur le champ de filtrage et nouveau filtre
- **`Escape`** : Effacer le filtre actuel
- **`?`** : Afficher la liste des raccourcis (modal d'aide)

#### Sélection d'Année
- **Position** : Dans la barre de résumé des transactions ET panneau statistiques
- **Scope** : Affecte les transactions et les graphiques
- **Persistance** : État maintenu lors des changements de vue
- **Override** : Option "Tout l'historique" désactive le filtre par année

### Graphiques
- **Par mois** : Somme dépenses par mois (année sélectionnée)
- **Par catégorie** : Répartition en % (année sélectionnée)
- **Recharts** avec tooltips formatés et responsive design

### Import CSV
- **Prévisualisation** : Affichage des 5 premières lignes avec détection du format
- **Gestion d'erreurs** : Messages détaillés avec logs backend
- **Support multi-format** : Standard (virgule) et bancaire (point-virgule)
- **Détection doublons** : Basée sur hash SHA256

## Nouvelles Fonctionnalités Implémentées

### Sélection Multiple et Actions en Lot
- **Sélection avec souris** : Ctrl+clic et Shift+clic pour sélection multiple
- **Feedback visuel** : Ligne sélectionnée avec background `#dbeafe`
- **Catégorisation groupée** : Modal permettant d'appliquer catégorie/sous-catégorie à plusieurs transactions
- **Menu contextuel intelligent** : Actions de filtrage/suppression désactivées pour sélections multiples

### Système de Raccourcis Clavier
- **`/` (slash)** : Met le focus sur le champ de recherche et efface le contenu existant
- **`Escape`** : Efface le filtre actuel et remet le focus sur la liste
- **`?` (point d'interrogation)** : Affiche une modal avec la liste complète des raccourcis
- **Gestion des événements** : Événements capturés au niveau document avec gestion des conflits

### Filtrage Historique Avancé
- **Checkbox "Tout l'historique"** : Permet de voir toutes les transactions indépendamment de l'année
- **État persistant** : Choix conservé lors des changements de vue
- **API intelligente** : Paramètre `year=null` envoyé au backend pour récupérer tout l'historique

### Interface Utilisateur Améliorée
- **Champ de recherche à taille fixe** : `width: 350px; flex-shrink: 0;` pour éviter le redimensionnement
- **Sélecteur d'année** : Ajouté dans le panneau Statistiques avec composant YearSelector réutilisable
- **Actions contextuelles** : Suppression de l'édition inline, remplacement par catégorisation directe

## Composants Clés

### TransactionList.jsx
**Fonctionnalités principales :**
- Gestion de l'état de sélection multiple (`selectedTransactions` Set)
- Algorithme de filtrage avec distance de Levenshtein pour recherche floue
- Modal de catégorisation avec sélection catégorie/sous-catégorie
- Système de raccourcis clavier global
- API calls pour opérations en lot

### TransactionRow.jsx
**Fonctionnalités principales :**
- Gestion des clics avec modificateurs (Ctrl/Shift)
- Menu contextuel avec états conditionnels
- Feedback visuel pour sélection
- Actions catégoriser/filtrer/supprimer avec gestion des permissions

### YearSelector.jsx
**Composant réutilisable :**
- Dropdown HTML simple avec années disponibles
- Gestion des valeurs entières avec `parseInt()`
- Intégration dans App.jsx et panneau Statistiques