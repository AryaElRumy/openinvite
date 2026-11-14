from pydantic_settings import BaseSettings, SettingsConfigDict


class AppSettings(BaseSettings):
    APP_NAME: str = "OpenInvite"
    APP_VERSION: str = "0.1.0"
    APP_DESCRIPTION: str = "Wedding invitation management API"
    APP_PORT: int = 8000

    PUBLIC_DIR: str = "public"
    TOOLS_DIR: str = "tools"
    FRONTEND_DIST: str = "frontend/dist"

    SECRET_KEY: str = "dev-insecure-secret-change-me-before-production-32"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7
    COOKIE_NAME: str = "openinvite_session"
    COOKIE_SECURE: bool = False

    ALLOW_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]
    ALLOW_METHODS: list[str] = ["*"]
    ALLOW_HEADERS: list[str] = ["*"]

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
