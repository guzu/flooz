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
│   │   │   ├── TransactionList.jsx      # Liste éditable
│   │   │   ├── TransactionRow.jsx       # Ligne éditable
│   │   │   ├── ImportPanel.jsx          # Upload CSV
│   │   │   ├── CategoryManager.jsx      # Gestion catégories
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

## Configuration Démarrage Rapide

### Backend (requirements.txt)
```
Flask==3.0.0
Flask-CORS==4.0.0
python-dotenv==1.0.0
```

### Frontend (package.json - dépendances clés)
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "recharts": "^2.10.0",
    "axios": "^1.6.0"
  }
}
```

## Format CSV Attendu

```csv
date,label,amount
2025-01-15,CARREFOUR PARIS,45.30
2025-01-16,RATP NAVIGO,75.20
2025-01-20,LOYER JANVIER,1200.00
```

**Colonnes supportées :**
- `date` (requis) : Format YYYY-MM-DD ou DD/MM/YYYY
- `label` (requis) : Libellé de la transaction
- `amount` (requis) : Montant (positif pour dépenses)
- `category` (optionnel) : Nom de catégorie

## Points Clés Architecture

### Détection Doublons
Hash calculé : `SHA256(date + label + amount)`
- À l'import, vérification de l'existence du hash
- Si existe : transaction ignorée
- Si nouveau : insertion

### Édition Inline
- Double-clic sur une cellule → mode édition
- Dropdown pour catégories avec codes couleur
- Sauvegarde automatique au blur/Enter

### Graphiques
- **Par mois** : Somme dépenses par mois (année sélectionnée)
- **Par catégorie** : Répartition en % (année sélectionnée)
- Recharts avec tooltips formatés

### Filtres Liste
- Année en cours par défaut
- Option "Tout l'historique"
- Tri par date décroissant