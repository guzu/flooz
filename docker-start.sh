#!/bin/bash

# Budget Manager - Docker Single Container Deployment Script

echo "🐳 Démarrage de Budget Manager avec Docker..."

# Vérifier que Docker est installé
if ! command -v docker &> /dev/null; then
    echo "❌ Docker n'est pas installé. Veuillez l'installer avant de continuer."
    exit 1
fi

# Créer le répertoire data s'il n'existe pas
mkdir -p data

# Construire l'image Docker
echo "🏗️  Construction de l'image Docker..."
docker build -t budget-manager .

# Arrêter et supprimer le conteneur existant s'il existe
if [ "$(docker ps -aq -f name=budget-manager)" ]; then
    echo "🔄 Arrêt du conteneur existant..."
    docker stop budget-manager >/dev/null 2>&1
    docker rm budget-manager >/dev/null 2>&1
fi

# Démarrer le nouveau conteneur
echo "🚀 Démarrage du conteneur..."
docker run -d \
    --name budget-manager \
    -p 80:80 \
    -v "$(pwd)/data:/app/data" \
    budget-manager

# Attendre que le service soit prêt
echo "⏳ Attente du démarrage du service..."
sleep 5

# Vérifier le statut du conteneur
if [ "$(docker ps -q -f name=budget-manager)" ]; then
    echo "✅ Budget Manager est maintenant accessible sur:"
    echo "   Application: http://localhost"
    echo ""
    echo "Commandes utiles:"
    echo "   Voir les logs: docker logs -f budget-manager"
    echo "   Arrêter:       docker stop budget-manager"
    echo "   Redémarrer:    docker restart budget-manager"
    echo "   Supprimer:     docker stop budget-manager && docker rm budget-manager"
else
    echo "❌ Erreur lors du démarrage du conteneur"
    echo "Vérifiez les logs avec: docker logs budget-manager"
    exit 1
fi