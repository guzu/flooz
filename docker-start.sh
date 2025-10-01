#!/bin/bash

# Flooz - Docker Single Container Deployment Script

echo "🐳 Démarrage de Flooz avec Docker..."

# Vérifier que Docker est installé
if ! command -v docker &> /dev/null; then
    echo "❌ Docker n'est pas installé. Veuillez l'installer avant de continuer."
    exit 1
fi

# Créer le répertoire data s'il n'existe pas
mkdir -p data

# Construire l'image Docker
echo "🏗️  Construction de l'image Docker..."
docker build -t flooz .

# Arrêter et supprimer le conteneur existant s'il existe
if [ "$(docker ps -aq -f name=flooz)" ]; then
    echo "🔄 Arrêt du conteneur existant..."
    docker stop flooz >/dev/null 2>&1
    docker rm flooz >/dev/null 2>&1
fi

# Démarrer le nouveau conteneur
echo "🚀 Démarrage du conteneur..."
docker run -d \
    --name flooz \
    -p 80:80 \
    -v "$(pwd)/data:/app/data" \
    flooz

# Attendre que le service soit prêt
echo "⏳ Attente du démarrage du service..."
sleep 5

# Vérifier le statut du conteneur
if [ "$(docker ps -q -f name=flooz)" ]; then
    echo "✅ Flooz est maintenant accessible sur:"
    echo "   Application: http://localhost"
    echo ""
    echo "Commandes utiles:"
    echo "   Voir les logs: docker logs -f flooz"
    echo "   Arrêter:       docker stop flooz"
    echo "   Redémarrer:    docker restart flooz"
    echo "   Supprimer:     docker stop flooz && docker rm flooz"
else
    echo "❌ Erreur lors du démarrage du conteneur"
    echo "Vérifiez les logs avec: docker logs flooz"
    exit 1
fi