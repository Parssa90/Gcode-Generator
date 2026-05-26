from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # Anthropic
    anthropic_api_key: str = ""
    claude_model: str = "claude-sonnet-4-6"

    # Server
    host: str = "0.0.0.0"
    port: int = 8000
    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:5173"]

    # Database
    database_url: str = "sqlite:///./aria.db"

    # Email (Google OAuth)
    google_client_id: str = ""
    google_client_secret: str = ""
    google_redirect_uri: str = "http://localhost:8000/api/auth/google/callback"

    # Laptop agent WebSocket
    laptop_agent_url: str = "ws://localhost:8765"

    # Storage
    uploads_dir: str = "./uploads"
    logs_dir: str = "./logs"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
