<div align="center">
  <img src="img/banner.png" alt="Flooz" width="400"/>
</div>

# Flooz


Flooz est une application web simple et rapide pour suivre vos dépenses.<br>
Import automatique depuis vos relevés bancaires, catégorisation intelligente, et visualisations claires pour comprendre où va votre argent.

## KISS (keep-it-simple-stupid) 🧘
- Installation en une commande
- Base de données SQLite en **un seul fichier** (facile à sauvegarder)
- Pas de login et de gestion multi-utilisateur
  - Facilement partageable sur un NAS ou un petit serveur à la maison
- **Import** "intelligent" et catégorisation automatique
  - Glissez-déposez vos fichiers CSV bancaires
  - Création de règle de catégorisation pour les futurs imports
  - Détection automatique des doublons
- **Catégorisation**
  - Sous-catégories pour plus de précision
  - Catégorisation en lot
- **Visualisations claires**
  - Diagramme de répartition des catégories
  - Graphiques mensuels et par catégorie

## DISCLAIMER ⚠️
 Flooz est entierement ***viber-codé***, et je n'ai aucune compétence particulière dans les technos utilisées...<br>
 Aucune ganrantie n'est apporté quand à la justesse, ni la perte de données.

## Installation et Démarrage 🚀

### Prérequis

- Python 3.8+
- Node.js 18+ et npm
- pip/venv

### Démarrage Rapide

```bash
git clone https://github.com/guzu/flooz.git
cd flooz
./install-deps.sh
./start.sh
```

L'application sera accessible sur : http://localhost:3000


## Déploiement Docker 📦

### Conteneur Unique

```bash
# Option 1: Docker Compose (recommandé)
docker-compose up -d

# Option 2: Script automatique
./docker-start.sh
```

**Application accessible sur** : http://localhost

Voir [DOCKER.md](DOCKER.md) pour plus de détails.

## Gestion de la Base de Données

La base de données est créée **automatiquement au premier démarrage**.

### Réinitialiser

```bash
cd backend
source venv/bin/activate
python init_db.py --reset
```

La base SQLite est stockée dans `data/flooz-budget.db`.

### Sauvegardes Automatiques 💾

#### Backup binaire (SQLite) - locale

```bash
cp data/flooz-budget.db /somewhere/flooz-budget-$(date '+%F-%T').db
```

#### Backup binaire (SQLite) - distant

```bash
curl -o ~/backups/flooz-$(date '+%F-%T').db http://localhost:5000/api/export/database
```

#### Export JSON complet - distant
```bash
curl -o flooz-export-$(date '+%F-%T').json http://localhost:5000/api/export/json
```

# Documentation 📒

- **[docs/API.md](docs/API.md)** - Documentation complète de l'API REST
- **[docs/CONTRIBUTING.md](docs/CONTRIBUTING.md)** - Guide développeur et architecture
- **[docs/TESTING.md](docs/TESTING.md)** - Guide des tests
- **[DOCKER.md](DOCKER.md)** - Déploiement Docker détaillé
- **[CLAUDE.md](CLAUDE.md)** - Guide pour Claude Code (IA)

## Technologies

- **Backend** : Python, Flask, SQLite
- **Frontend** : React, Vite, Recharts, D3-Sankey
- **Déploiement** : Docker, Nginx

# License 🫶

**CC BY-NC-SA 4.0** - Non-Commercial ShareAlike

### Conditions supplémentaires pour l'hébergement public

Si vous proposez un hébergement de Flooz (instance publique ou partagée) :
- **Conservation du nom** : L'application DOIT conserver le nom "Flooz"
- **Indication de la source** : Vous DEVEZ garder le lien ou une mention du dépôt original

[Texte complet de la licence](https://creativecommons.org/licenses/by-nc-sa/4.0/)
