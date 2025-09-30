#!/bin/bash

# Single container entrypoint script

echo "🐳 Starting Budget Manager in single container mode..."

# Start nginx in background
nginx &

# Start Flask backend in foreground
cd /app/backend
python app.py