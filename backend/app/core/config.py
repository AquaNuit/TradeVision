"""
TradeVision Pro — Configuration
Reads all settings from backend/.env file (local-only).
"""
import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    APP_NAME: str = "TradeVision Pro"
    VERSION: str = "1.0.0"
    DEBUG: bool = True
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # JWT Auth — auto-generated locally
    SECRET_KEY: str = "change-me-in-env-file"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours

    # Default admin
    ADMIN_USERNAME: str = "admin"
    ADMIN_PASSWORD: str = "tradevision2026"
    ADMIN_EMAIL: str = "admin@tradevision.local"

    # Database
    DATABASE_URL: str = "sqlite:///./tradevision.db"

    # External APIs
    ALPHA_VANTAGE_KEY: str = "demo"

    # Telegram
    TELEGRAM_BOT_TOKEN: str = ""
    TELEGRAM_CHAT_ID: str = ""

    # Email
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    ALERT_EMAIL_TO: str = ""

    model_config = {
        "env_file": os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"),
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }


settings = Settings()
