from pydantic_settings import BaseSettings, SettingsConfigDict


class DatabaseSettings(BaseSettings):
    DB_HOST: str = "localhost"
    DB_PORT: int = 5432
    DB_USER: str = "admin"
    DB_PASSWORD: str = "admin"
    DB_NAME: str = "openinvite"
    AGENT_DB_SCHEMA: str = "agent"
    AGENT_DB_URL: str | None = None

    @property
    def DATABASE_URL(self):
        return f"postgresql://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"

    @property
    def AGENT_DATABASE_URL(self):
        return self.AGENT_DB_URL or self.DATABASE_URL

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
