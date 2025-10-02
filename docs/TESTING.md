# Guide de Tests - Flooz

## Vue d'Ensemble

Flooz utilise des scripts de tests bash avec `curl` pour valider le fonctionnement de l'API.

## Prérequis

### Installer jq (optionnel mais recommandé)

```bash
# Ubuntu/Debian
sudo apt install jq

# macOS
brew install jq

# Windows (WSL)
sudo apt install jq
```

`jq` permet de formater et filtrer les réponses JSON pour une meilleure lisibilité.

## Scripts de Tests Disponibles

### Tous les tests

```bash
./test/run_all_tests.sh
```

Exécute tous les tests dans l'ordre :
1. Tests des transactions
2. Tests des catégories
3. Tests d'import CSV
4. Tests des statistiques

### Tests spécifiques

```bash
# Tests des transactions
./test/test_transactions.sh

# Tests des catégories
./test/test_categories.sh

# Tests d'import
./test/test_import.sh

# Tests des statistiques
./test/test_stats.sh
```

## Structure des Tests

### test_transactions.sh

Teste les opérations CRUD sur les transactions :
- Création de transaction
- Récupération de la liste
- Modification
- Suppression

### test_categories.sh

Teste la gestion des catégories :
- Création de catégorie
- Récupération de la liste
- Gestion des sous-catégories
- Règles de catégorisation

### test_import.sh

Teste l'import de fichiers CSV :
- Prévisualisation du CSV
- Import de transactions
- Détection de doublons
- Support multi-formats

### test_stats.sh

Teste les endpoints de statistiques :
- Années disponibles
- Statistiques mensuelles
- Répartition par catégorie
- Diagramme de Sankey
- Résumé annuel

## Exécution des Tests

### Démarrer le backend

Avant de lancer les tests, assurez-vous que le backend est en cours d'exécution :

```bash
cd backend
source venv/bin/activate
python app.py
```

Le serveur démarre sur `http://localhost:5000`.

### Lancer les tests

```bash
# Tous les tests
./test/run_all_tests.sh

# Test spécifique avec sortie formatée
./test/test_transactions.sh | jq .
```

## Écrire de Nouveaux Tests

### Structure d'un script de test

```bash
#!/bin/bash

API_URL="http://localhost:5000/api"

echo "=== Test de ma fonctionnalité ==="

# Test 1: Créer une ressource
echo "Test 1: Création..."
curl -X POST "$API_URL/endpoint" \
  -H "Content-Type: application/json" \
  -d '{
    "field": "value"
  }' | jq .

# Test 2: Récupérer la ressource
echo "Test 2: Récupération..."
curl -X GET "$API_URL/endpoint" | jq .

# Test 3: Nettoyer
echo "Test 3: Nettoyage..."
curl -X DELETE "$API_URL/endpoint/1" | jq .
```

### Bonnes Pratiques

1. **Isolation** : Chaque test doit être indépendant
2. **Cleanup** : Nettoyer les données créées en fin de test
3. **Assertions** : Vérifier les codes de réponse HTTP
4. **Documentation** : Commenter les tests complexes

## Tests Manuels

### Avec curl

```bash
# Créer une transaction
curl -X POST http://localhost:5000/api/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2025-01-15",
    "label": "Test",
    "amount": 50.00
  }'

# Lister les transactions
curl http://localhost:5000/api/transactions | jq .

# Obtenir les stats
curl http://localhost:5000/api/stats/summary/2025 | jq .
```

### Avec l'interface web

1. Démarrer frontend et backend
2. Ouvrir http://localhost:3000
3. Tester les fonctionnalités via l'UI
4. Vérifier la console navigateur pour les erreurs

## Tests de Performance (TODO)

- Load testing avec Apache Bench
- Monitoring avec Prometheus
- Tests de charge avec k6

## CI/CD (TODO)

- GitHub Actions pour tests automatiques
- Tests sur PR
- Coverage reports
