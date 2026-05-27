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

    # Outlook / Office 365 email
    outlook_email: str = ""        # full address e.g. you@company.com or you@outlook.com
    outlook_password: str = ""     # account password — or App Password if MFA is enabled

    # Google OAuth (optional — not required when using Outlook)
    google_client_id: str = ""
    google_client_secret: str = ""
    google_redirect_uri: str = "http://localhost:8000/api/auth/google/callback"

    # Microsoft Teams Bot
    teams_bot_app_id: str = ""        # Azure Bot → Microsoft App ID
    teams_bot_app_password: str = ""  # Azure Bot → Client Secret
    teams_tenant_id: str = ""         # Azure AD tenant (or "common" for multi-tenant)
    teams_client_id: str = ""         # Same as teams_bot_app_id (Graph API)
    teams_client_secret: str = ""     # Same as teams_bot_app_password (Graph API)
    teams_organizer_user_id: str = "" # Object ID of your M365 user (for Graph transcript API)

    # Laptop agent WebSocket
    laptop_agent_url: str = "ws://localhost:8765"

    # Storage
    uploads_dir: str = "./uploads"
    logs_dir: str = "./logs"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
