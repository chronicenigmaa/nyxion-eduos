from sqlalchemy import create_engine
from sqlalchemy.engine.url import make_url
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

parsed_url = make_url(settings.DATABASE_URL)
is_local_db = parsed_url.host in {"localhost", "127.0.0.1", "postgres", None}
has_sslmode = "sslmode" in parsed_url.query

engine_kwargs = {"pool_pre_ping": True}
if not is_local_db and not has_sslmode and parsed_url.drivername.startswith("postgresql"):
    # Hosted Postgres providers generally require SSL if not specified explicitly.
    engine_kwargs["connect_args"] = {"sslmode": "require"}

engine = create_engine(settings.DATABASE_URL, **engine_kwargs)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db_location() -> dict:
    return {
        "driver": parsed_url.drivername,
        "host": parsed_url.host,
        "port": parsed_url.port,
        "database": parsed_url.database,
        "is_local": is_local_db,
    }

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
