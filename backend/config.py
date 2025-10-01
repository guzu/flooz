import os
from pathlib import Path

class Config:
    BASE_DIR = Path(__file__).parent.parent
    DB_PATH = BASE_DIR / 'data' / 'flooz-budget.db'

    @classmethod
    def init_app(cls):
        os.makedirs(cls.BASE_DIR / 'data', exist_ok=True)