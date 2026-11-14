from pydantic_settings import BaseSettings, SettingsConfigDict


class AppSettings(BaseSettings):
    APP_NAME: str = "FastAPI Template"
    APP_VERSION: str = "0.1.0"
    APP_DESCRIPTION: str = "FastAPI Template API for Edge Deployments"
    APP_PORT: int = 8000

    PUBLIC_DIR: str = "public"
    TOOLS_DIR: str = "tools"

    ALLOW_ORIGINS: list[str] = ["*"]
    ALLOW_METHODS: list[str] = ["*"]
    ALLOW_HEADERS: list[str] = ["*"]

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
