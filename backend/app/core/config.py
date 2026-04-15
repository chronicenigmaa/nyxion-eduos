from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    APP_NAME: str = "Nyxion EduOS"
    SECRET_KEY: str = "nyxion-super-secret-key-change-in-prod"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24

    DATABASE_URL: str = "postgresql://nyxion:nyxion123@localhost:5433/nyxion"
    REDIS_URL: str = "redis://localhost:6379"

    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "llama3.2"

    class Config:
        env_file = ".env"

settings = Settings()