import os
from dotenv import load_dotenv

load_dotenv()

_DEFAULT_DB = os.path.join(os.path.dirname(__file__), "documents.db")
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{_DEFAULT_DB}")
