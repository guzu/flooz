#!/bin/bash

# Script d'installation du Budget Manager
echo "🔧 Installation du Budget Manager..."
echo ""

# Check Python version
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 n'est pas installé. Veuillez l'installer d'abord."
    exit 1
fi

PYTHON_VERSION=$(python3 --version | cut -d " " -f 2 | cut -d "." -f 1,2)
echo "✓ Python $PYTHON_VERSION détecté"

# Check Node.js version
if ! command -v node &> /dev/null; then
    echo "❌ Node.js n'est pas installé. Veuillez l'installer d'abord."
    exit 1
fi

NODE_VERSION=$(node --version)
echo "✓ Node.js $NODE_VERSION détecté"

# Install backend dependencies
echo ""
echo "📦 Installation des dépendances backend..."
cd backend

if [ ! -d "venv" ]; then
    python3 -m venv venv
    echo "✓ Environnement virtuel Python créé"
fi

source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
echo "✓ Dépendances Python installées"

# Initialize database
echo ""
echo "🗄️  Initialisation de la base de données..."
python init_db.py
echo "✓ Base de données initialisée"

cd ..

# Install frontend dependencies
echo ""
echo "📦 Installation des dépendances frontend..."
cd frontend
npm install
echo "✓ Dépendances Node.js installées"

cd ..

echo ""
echo "✅ Installation terminée avec succès !"
echo ""
echo "Pour démarrer l'application :"
echo "  ./start.sh"
echo ""
echo "Pour Docker :"
echo "  docker-compose up -d"
echo ""