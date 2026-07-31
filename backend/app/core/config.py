from pydantic_settings import BaseSettings
from pydantic import field_validator

class Settings(BaseSettings):
    ENV: str = "development"
    APP_NAME: str = "Nyxion EduOS"
    SECRET_KEY: str = "nyxion-super-secret-key-change-in-prod"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24

    DATABASE_URL: str = "postgresql://nyxion:nyxion123@localhost:5433/nyxion"
    REDIS_URL: str = "redis://localhost:6379"

    # Postgres schema that owns every EduOS table. Defaults to "eduos", not
    # "public": the database is shared with LearnSpace and both define tables
    # named users/events, so "public" silently puts EduOS's data somewhere the
    # deployed app (which sets DB_SCHEMA=eduos) never reads. Tools run without
    # this variable used to land in the wrong schema entirely.
    DB_SCHEMA: str = "eduos"

    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "llama3.2"

    # ── AI (Groq) ────────────────────────────────────────────────────────────
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama-3.3-70b-versatile"

    # ── Bootstrap super admin ────────────────────────────────────────────────
    # Guarantees at least one usable login exists after a fresh deploy.
    # The password is only applied when the account is first created; later
    # password changes are never overwritten on restart.
    SUPER_ADMIN_EMAIL: str = "superadmin@nyxion.ai"
    SUPER_ADMIN_PASSWORD: str = "admin123"
    SUPER_ADMIN_NAME: str = "Nyxion Super Admin"
    # Force a password change on first login when using the default password.
    SUPER_ADMIN_FORCE_PASSWORD_CHANGE: bool = True

    # Seed the demo schools / teachers / students / fees.
    # OFF by default: the live database already contains real schools and a real
    # customer, and re-seeding must never mutate or pollute that data. Only turn
    # this on against a genuinely fresh, empty database.
    SEED_DEMO_DATA: bool = False

    # ── Password reset email ─────────────────────────────────────────────────
    FRONTEND_URL: str = "https://nyxion-eduos.vercel.app"
    RESEND_API_KEY: str = ""
    MAIL_FROM: str = "onboarding@resend.dev"
    MAIL_FROM_NAME: str = "Nyxion EduOS"
    RESET_TOKEN_EXPIRE_MINUTES: int = 60

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def normalize_database_url(cls, value: str) -> str:
        # Railway can provide postgres:// URLs, while SQLAlchemy expects postgresql://
        if isinstance(value, str) and value.startswith("postgres://"):
            return "postgresql://" + value[len("postgres://"):]
        return value

    @field_validator("FRONTEND_URL", mode="before")
    @classmethod
    def strip_trailing_slash(cls, value: str) -> str:
        return value.rstrip("/") if isinstance(value, str) else value

    @property
    def is_production(self) -> bool:
        return self.ENV.strip().lower() in {"production", "prod"}

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
