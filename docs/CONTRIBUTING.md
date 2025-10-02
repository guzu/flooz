# Guide de Contribution - Flooz

## Architecture du Projet

```
flooz/
├── backend/           # API Flask + SQLite
│   ├── models/        # Modèles de données
│   ├── services/      # Logique métier
│   ├── routes/        # Endpoints API
│   └── utils/         # Utilitaires (hash, etc.)
├── frontend/          # Interface React + Vite
├── test/              # Scripts de tests API
└── data/              # Base SQLite (créée automatiquement)
```

## Structure du Code

### Backend (Python/Flask)

- **Modèles** : SQLite avec `sqlite3.Row` pour accès par nom
- **Services** : Logique métier séparée des routes
- **Routes** : Endpoints REST avec gestion d'erreurs
- **Tests** : Scripts bash avec curl pour validation complète

### Frontend (React/Vite)

- **Composants** : Architecture modulaire avec hooks
- **Services** : API client avec Axios
- **Graphiques** : Recharts + D3-Sankey pour visualisations
- **Styles** : CSS personnalisé

## Configuration

### Backend

- **Port** : 5000 (configurable dans `app.py`)
- **Base de données** : `data/flooz-budget.db` (SQLite)
- **CORS** : Activé pour développement frontend

### Détection de Doublons

Hash SHA256 calculé sur `date + label + amount` pour éviter les imports multiples.

## Fonctionnalités Disponibles

✅ **Frontend React complet** : Interface utilisateur moderne et responsive avec sélection multiple

✅ **Import CSV intelligent** : Support formats bancaire et standard

✅ **Catégorisation automatique** : Règles configurables + actions manuelles en lot

✅ **Graphiques interactifs** :
  - Diagramme de Sankey interactif (flux catégories → sous-catégories)
  - Graphiques mensuels et répartition par catégorie
  - Toggle €/% pour basculer entre montants et pourcentages
  - Sélecteur d'année intégré

✅ **Raccourcis clavier** : Navigation rapide avec `/` (recherche), `Escape` (effacer), `?` (aide)

✅ **Filtrage avancé** : Recherche floue + option "Tout l'historique" pour voir toutes les années

✅ **Sélection multiple** : Ctrl/Shift + clic pour actions en lot (catégorisation groupée, sans sélection de texte)

✅ **Gestion des catégories** : CRUD complet avec couleurs personnalisées et sous-catégories

✅ **Sous-catégories intelligentes** : Tri automatique et regroupement dans le diagramme de Sankey

✅ **Déploiement Docker** : Conteneurisation en conteneur unique

## Roadmap

### Prochaines Étapes Possibles

1. **Authentification** : Gestion multi-utilisateurs
2. **Export** : PDF, Excel des statistiques
3. **Sauvegarde** : Backup automatique de la base de données
4. **API REST** : Documentation OpenAPI/Swagger

## Comment Contribuer

1. Fork le projet
2. Créer une branche pour votre fonctionnalité (`git checkout -b feature/AmazingFeature`)
3. Commiter vos changements (`git commit -m 'Add some AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

### Standards de Code

- **Python** : PEP 8
- **JavaScript** : ESLint avec config React
- **Commits** : Messages clairs et descriptifs
- **Tests** : Ajouter des tests pour les nouvelles fonctionnalités

### Documentation

Lors de l'ajout de nouvelles fonctionnalités, mettre à jour :
- `docs/API.md` pour les nouveaux endpoints
- `docs/CONTRIBUTING.md` pour les changements d'architecture
- `README.md` si la fonctionnalité est majeure
- `CLAUDE.md` pour guider l'IA sur le projet
