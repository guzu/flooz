#!/bin/bash

# Script de démarrage complet du Budget Manager
echo "🚀 Démarrage du Budget Manager..."

# Vérifier que les dépendances sont installées
if [ ! -d "backend/venv" ]; then
    echo "❌ Environnement virtuel Python non trouvé. Veuillez suivre les instructions d'installation."
    exit 1
fi

if [ ! -d "frontend/node_modules" ]; then
    echo "❌ Dépendances Node.js non installées. Veuillez exécuter 'npm install' dans le dossier frontend."
    exit 1
fi

# Fonction pour nettoyer les processus en arrière-plan
cleanup() {
    echo ""
    echo "🛑 Arrêt des services..."
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null
    fi
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null
    fi
    echo "✅ Services arrêtés."
    exit 0
}

# Capturer Ctrl+C pour nettoyer proprement
trap cleanup SIGINT

echo "📡 Démarrage de l'API backend..."
cd backend
source venv/bin/activate

# Initialize database if needed
echo "🔧 Vérification/initialisation de la base de données..."
python init_db.py

python app.py &
BACKEND_PID=$!
cd ..

# Attendre que le backend soit prêt
echo "⏳ Attente du démarrage du backend..."
sleep 3

# Vérifier que le backend répond
if ! curl -s http://localhost:5000/api/categories > /dev/null; then
    echo "❌ Le backend ne répond pas. Vérifiez les logs ci-dessus."
    cleanup
fi

echo "🎨 Démarrage du frontend..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "✅ Budget Manager démarré avec succès !"
echo ""
echo "🌐 Interface web : http://localhost:3000"
echo "📡 API backend  : http://localhost:5000"
echo ""
echo "Appuyez sur Ctrl+C pour arrêter les services."

# Attendre jusqu'à ce que l'utilisateur appuie sur Ctrl+C
wait