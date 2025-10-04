# API Documentation - Flooz

Documentation complète de l'API REST de Flooz.

## Base URL

```
http://localhost:5000/api
```

## Endpoints

### Transactions

#### GET /api/transactions

Liste des transactions avec filtrage optionnel par année.

**Paramètres de requête :**
- `year` (optionnel) : Année pour filtrer les transactions

**Réponse :**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "date": "2025-01-15",
      "label": "CARREFOUR PARIS",
      "amount": 45.30,
      "category_id": 1,
      "subcategory_id": 3,
      "notes": "Courses alimentaires"
    }
  ]
}
```

#### POST /api/transactions

Créer une nouvelle transaction.

**Corps de la requête :**
```json
{
  "date": "2025-01-15",
  "label": "CARREFOUR PARIS",
  "amount": 45.30,
  "category_id": 1,
  "subcategory_id": 3,
  "notes": "Courses alimentaires"
}
```

#### PUT /api/transactions/{id}

Modifier une transaction existante.

#### DELETE /api/transactions/{id}

Supprimer une transaction.

### Catégories

#### GET /api/categories

Liste de toutes les catégories.

**Réponse :**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Alimentation",
      "color": "#10b981",
      "icon": "🍽️"
    }
  ]
}
```

#### POST /api/categories

Créer une nouvelle catégorie.

#### GET /api/categories/rules

Liste des règles de catégorisation automatique.

**Réponse :**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "pattern": "CARREFOUR|AUCHAN|LECLERC",
      "category_id": 1,
      "priority": 10
    }
  ]
}
```

### Sous-catégories

#### GET /api/subcategories

Liste de toutes les sous-catégories.

#### GET /api/categories/{id}/subcategories

Sous-catégories d'une catégorie spécifique.

#### POST /api/subcategories

Créer une nouvelle sous-catégorie.

### Import

#### POST /api/import/validate

Valider un fichier CSV avant import.

**Paramètres :**
- `file` : Fichier CSV (multipart/form-data)
- `bank_type` (optionnel) : Type de format bancaire (auto, boursorama, banque_populaire, standard)

**Réponse :**
```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "row_num": 2,
        "date": "2025-01-15",
        "operation_date": "2025-01-15",
        "label": "CARREFOUR PARIS",
        "amount": 45.30,
        "category_id": 1,
        "hash": "abc123...",
        "is_duplicate": false
      }
    ],
    "errors": [],
    "format": "standard"
  }
}
```

#### POST /api/import/validate-qif

Valider un fichier QIF avant import.

**Paramètres :**
- `file` : Fichier QIF (multipart/form-data)

**Réponse :**
```json
{
  "success": true,
  "data": {
    "transactions": [...],
    "errors": [],
    "format": "qif"
  }
}
```

#### POST /api/import/validated

Importer des transactions validées.

**Corps de la requête :**
```json
{
  "transactions": [
    {
      "date": "2025-01-15",
      "label": "CARREFOUR PARIS",
      "amount": 45.30,
      "category_id": 1,
      "hash": "abc123...",
      "notes": "Courses",
      "excluded": false
    }
  ]
}
```

**Réponse :**
```json
{
  "success": true,
  "data": {
    "imported": 45,
    "duplicates": 3,
    "errors": []
  }
}
```

### Statistiques

#### GET /api/stats/years

Années disponibles dans la base de données.

**Réponse :**
```json
{
  "success": true,
  "data": [2025, 2024, 2023]
}
```

#### GET /api/stats/monthly/{year}

Statistiques mensuelles pour une année.

**Réponse :**
```json
{
  "success": true,
  "data": [
    {
      "month": "Jan",
      "month_num": 1,
      "amount": 1234.56,
      "transaction_count": 45
    }
  ]
}
```

#### GET /api/stats/monthly-by-category/{year}

Statistiques mensuelles par catégorie.

#### GET /api/stats/categories/{year}

Répartition des dépenses par catégorie.

**Réponse :**
```json
{
  "success": true,
  "data": [
    {
      "category_id": 1,
      "category_name": "Alimentation",
      "color": "#10b981",
      "amount": 3456.78,
      "percentage": 32.5,
      "transaction_count": 89,
      "avg_amount": 38.84
    }
  ]
}
```

#### GET /api/stats/sankey/{year}

Données pour le diagramme de Sankey (flux catégories → sous-catégories).

**Réponse :**
```json
{
  "success": true,
  "data": {
    "nodes": [
      {"name": "Total Dépenses", "color": "#8c70c7"},
      {"name": "Alimentation", "color": "#10b981", "value": 3456.78},
      {"name": "Courses", "color": "#059669", "value": 2100.00}
    ],
    "links": [
      {"source": 0, "target": 1, "value": 3456.78, "color": "#10b981"},
      {"source": 1, "target": 2, "value": 2100.00, "color": "#059669"}
    ],
    "total": 10500.00
  }
}
```

#### GET /api/stats/summary/{year}

Résumé annuel des statistiques.

### Export

#### GET /api/export/database

Télécharger la base de données SQLite complète.

**Réponse :**
- Type de contenu : `application/octet-stream`
- Nom de fichier : `flooz-budget.db`
- Corps : Fichier binaire SQLite

#### GET /api/export/json

Exporter toutes les données en JSON.

**Réponse :**
```json
{
  "success": true,
  "data": {
    "transactions": [...],
    "categories": [...],
    "subcategories": [...],
    "categorization_rules": [...]
  }
}
```

#### GET /api/export/csv/transactions

Exporter toutes les transactions en CSV.

**Réponse :**
- Type de contenu : `text/csv; charset=utf-8`
- Nom de fichier : `flooz-transactions.csv`
- Format :
```csv
Date,Date opération,Libellé,Montant,Catégorie,Sous-catégorie,Notes
2025-01-15,2025-01-15,CARREFOUR PARIS,45.30,Alimentation,Courses,Courses hebdomadaires
2025-01-16,,RATP NAVIGO,75.20,Transport,Transports en commun,
```

#### GET /api/export/csv/categories

Exporter les dépenses consolidées par catégorie/sous-catégorie en CSV.

**Réponse :**
- Type de contenu : `text/csv; charset=utf-8`
- Nom de fichier : `flooz-categories.csv`
- Format :
```csv
Catégorie,Sous-catégorie,Montant total,Nombre de transactions
Alimentation,Courses,2345.60,45
Alimentation,Restaurant,890.30,12
Transport,Transports en commun,225.60,3
```

## Formats CSV

### Format Standard

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

### Format Bancaire

```csv
Date;Bénéficiaire;Libellé;Référence;...;Débit;Crédit;...
24/09/2025;PICARD;PICARD 0738 FR VILLE;...;-29,08;;...
30/09/2025;VIREMENT;SALAIRE SEPTEMBRE;...;;2500,00;...
```

**Caractéristiques :**
- Séparateur : point-virgule (`;`)
- Détection automatique du format
- Support colonnes débit/crédit séparées
- Première ligne d'en-têtes ignorée automatiquement

### Format QIF (Quicken Interchange Format)

```
!Type:Bank
D01/15/2025
T-45.30
PCARREFOUR PARIS
MCourses hebdomadaires
^
D01/16/2025
T-75.20
PRATP NAVIGO
^
```

**Marqueurs QIF :**
- `!Type:Bank` : Type de compte (en-tête)
- `D` : Date de transaction (MM/DD/YYYY ou DD/MM/YYYY)
- `T` : Montant (négatif = dépense, positif = revenu)
- `P` : Bénéficiaire/Libellé
- `M` : Mémo/Notes (optionnel)
- `^` : Fin de transaction

**Caractéristiques :**
- Inversion automatique des montants (convention Flooz : positif = dépense)
- Catégorisation automatique basée sur le libellé
- Détection des doublons par hash
- Prévisualisation avant import

## Codes de Réponse

- `200 OK` : Requête réussie
- `201 Created` : Ressource créée avec succès
- `400 Bad Request` : Paramètres invalides
- `404 Not Found` : Ressource non trouvée
- `500 Internal Server Error` : Erreur serveur

## Format de Réponse

Toutes les réponses suivent ce format :

```json
{
  "success": true/false,
  "data": {...},
  "error": "message d'erreur" // seulement si success: false
}
```
