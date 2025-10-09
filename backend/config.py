import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class Config:
    BASE_DIR = Path(__file__).parent.parent
    DB_PATH = BASE_DIR / 'data' / 'flooz-budget.db'

    # AI Analysis Configuration
    AI_PROVIDER = os.getenv('AI_PROVIDER', 'claude')  # claude or ollama
    ANTHROPIC_API_KEY = os.getenv('ANTHROPIC_API_KEY', '')
    AI_TIMEOUT = int(os.getenv('AI_TIMEOUT', '30'))  # seconds

    # Ollama Configuration
    OLLAMA_BASE_URL = os.getenv('OLLAMA_BASE_URL', 'http://localhost:11434')
    OLLAMA_MODEL = os.getenv('OLLAMA_MODEL', 'llama3.2:3b')  # Default model

    @classmethod
    def init_app(cls):
        os.makedirs(cls.BASE_DIR / 'data', exist_ok=True)