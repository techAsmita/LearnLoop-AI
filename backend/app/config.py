from pydantic_settings import BaseSettings
from typing import Optional
import os


class Settings(BaseSettings):
    # App
    APP_NAME: str = "LearnLoop AI"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True

    # Database - defaults to SQLite for local development
    DATABASE_URL: str = "sqlite:///./learnloop.db"

    # Gemini
    GEMINI_API_KEY: Optional[str] = None
    GEMINI_MODEL: str = "gemini-3.5-flash-lite"

    # Mock / Demo mode - forced on if no API key
    MOCK_MODE: bool = True

    # CORS
    CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


settings = Settings()

# Force mock mode if no API key is present
if not settings.GEMINI_API_KEY:
    settings.MOCK_MODE = True
