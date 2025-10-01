#!/bin/bash

# Single container entrypoint script

echo "🐳 Starting Flooz in single container mode..."

# Initialize database
cd /app/backend
echo "🔧 Initializing database..."
python init_db.py

# Start nginx in background
nginx &

# Start Flask backend in foreground
echo "📡 Starting Flask backend..."
python app.py