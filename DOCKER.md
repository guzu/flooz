# Docker Deployment - Budget Manager

Ce guide explique comment déployer Budget Manager avec Docker en conteneur unique.

## Déploiement Conteneur Unique

Approche tout-en-un avec Nginx + Flask dans le même conteneur.

### Démarrage Rapide

```bash
# Option 1: Docker Compose (recommandé)
docker-compose up -d

# Option 2: Script automatique
./docker-start.sh

# Option 3: Manuellement
docker build -t budget-manager .
docker run -d -p 80:80 -v $(pwd)/data:/app/data --name budget-manager budget-manager
```

## Fichiers Docker

### Architecture mono-conteneur
- `Dockerfile`: Image combinée Python + Nginx + React
- `docker-compose.yml`: Orchestration simplifiée du conteneur unique
- `nginx.conf`: Configuration Nginx avec proxy local
- `docker-entrypoint.sh`: Script de démarrage des services

## Commandes Utiles

### Avec Docker Compose
```bash
# Démarrer l'application
docker-compose up -d

# Voir les logs
docker-compose logs -f

# Redémarrer
docker-compose restart

# Arrêter l'application
docker-compose down

# Rebuild et redémarrer
docker-compose up --build -d
```

### Avec Docker direct
```bash
# Construire l'image
docker build -t budget-manager .

# Démarrer le conteneur
docker run -d -p 80:80 -v $(pwd)/data:/app/data --name budget-manager budget-manager

# Voir les logs
docker logs -f budget-manager

# Redémarrer le conteneur
docker restart budget-manager

# Arrêter et supprimer
docker stop budget-manager && docker rm budget-manager

# Nettoyer les images
docker rmi budget-manager
docker system prune
```

## Volumes et Données

- **Base de données**: `./data/budget.db` (montée en volume)
- **Persistance**: Les données survivent aux redémarrages
- **Backup**: Copiez simplement le répertoire `./data/`

## Configuration

### Variables d'environnement
- `FLASK_ENV=production`
- `DATABASE_PATH=/app/data/budget.db`

### Ports
- **Application complète**: http://localhost (port 80)
- **API interne**: Backend Flask accessible via `/api/*`

### Architecture Interne
- **Nginx** : Serveur web principal (port 80)
- **Flask** : API backend (port 5000 interne)
- **Proxy** : Nginx route `/api/*` vers Flask automatiquement

## Production

Pour un déploiement en production:

1. **SSL/HTTPS**: Ajoutez un reverse proxy (Traefik, Caddy)
2. **Domaine**: Modifiez `server_name` dans nginx.conf
3. **Sécurité**: Configurez firewall et variables d'environnement
4. **Monitoring**: Logs via `docker logs` et métriques système
5. **Backup**: Automatisez la sauvegarde du volume `data/`

## Dépannage

### Problèmes courants
- **Port 80 occupé**: Changez le port: `docker run -p 8080:80`
- **Permissions**: Vérifiez les droits sur `./data/`
- **Build failed**: Nettoyez le cache: `docker system prune`

### Logs détaillés
```bash
# Logs généraux
docker logs budget-manager

# Logs en temps réel
docker logs -f budget-manager

# Accès au conteneur
docker exec -it budget-manager /bin/bash
```

### Debug des services
```bash
# Vérifier les processus dans le conteneur
docker exec budget-manager ps aux

# Vérifier la configuration nginx
docker exec budget-manager nginx -t

# Tester l'API backend
docker exec budget-manager curl http://localhost:5000/api/transactions
```