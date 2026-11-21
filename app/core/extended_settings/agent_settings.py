from pydantic_settings import BaseSettings, SettingsConfigDict


class AgentSettings(BaseSettings):
    MODEL_ID: str = "nvidia/nemotron-3-ultra-550b-a55b:free"
    API_KEY: str | None = None

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
