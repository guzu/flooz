#!/usr/bin/env python3
"""
Script pour initialiser ou réinitialiser la base de données.
Usage: python init_db.py [--reset]
"""
import sys
import os
from pathlib import Path
from config import Config
from models.database import init_db

def main():
    # Parse arguments
    reset = '--reset' in sys.argv or '-r' in sys.argv

    # Initialize config (create data directory)
    Config.init_app()

    if reset:
        db_path = Config.DB_PATH
        if db_path.exists():
            confirm = input(f"⚠️  Êtes-vous sûr de vouloir supprimer {db_path} ? (yes/no): ")
            if confirm.lower() in ['yes', 'y', 'oui', 'o']:
                os.remove(db_path)
                print(f"✓ Base de données supprimée : {db_path}")
            else:
                print("❌ Opération annulée")
                sys.exit(0)

    # Initialize database
    print("🔧 Initialisation de la base de données...")
    try:
        init_db()
        print(f"✓ Base de données initialisée avec succès : {Config.DB_PATH}")
        print("\n📊 Données par défaut créées :")
        print("  - 6 catégories (Alimentation, Transport, Logement, Santé, Loisirs, Non catégorisé)")
        print("  - 23 sous-catégories")
    except Exception as e:
        print(f"❌ Erreur lors de l'initialisation : {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()