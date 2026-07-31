from sqlalchemy import MetaData, create_engine, text
from sqlalchemy.engine.url import make_url
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

parsed_url = make_url(settings.DATABASE_URL)
is_local_db = parsed_url.host in {"localhost", "127.0.0.1", "postgres", None}
is_railway_internal = bool(parsed_url.host and parsed_url.host.endswith(".railway.internal"))
has_sslmode = "sslmode" in parsed_url.query

# Schema that owns every EduOS table. When the Postgres instance is shared with
# another application, pointing this away from "public" keeps the two sets of
# tables completely separate.
DB_SCHEMA = (settings.DB_SCHEMA or "public").strip()

connect_args: dict = {}

if (
    not is_local_db
    and not is_railway_internal
    and not has_sslmode
    and parsed_url.drivername.startswith("postgresql")
):
    # Hosted Postgres providers generally require SSL when using public endpoints.
    connect_args["sslmode"] = "require"

if DB_SCHEMA != "public":
    # Every unqualified table name — ORM and the raw ALTER TABLE statements in
    # main.py alike — resolves inside this schema.
    connect_args["options"] = f"-csearch_path={DB_SCHEMA},public"

engine_kwargs: dict = {"pool_pre_ping": True}
if connect_args:
    engine_kwargs["connect_args"] = connect_args

engine = create_engine(settings.DATABASE_URL, **engine_kwargs)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Binding the schema onto the MetaData (not just search_path) is what actually
# isolates us: it makes every CREATE TABLE and every foreign key explicitly
# schema-qualified. With search_path alone, create_all() would see another
# app's `public.users`, skip creating our own, and then wire our foreign keys
# into their table.
Base = declarative_base(
    metadata=MetaData(schema=DB_SCHEMA) if DB_SCHEMA != "public" else None
)


def ensure_schema_exists() -> None:
    """Create the target schema if it doesn't exist yet.

    A search_path pointing at a missing schema is silently ignored by Postgres,
    which would otherwise cause tables to be created in `public` by accident.
    """
    if DB_SCHEMA == "public":
        return
    with engine.begin() as conn:
        conn.execute(text(f'CREATE SCHEMA IF NOT EXISTS "{DB_SCHEMA}"'))


def get_db_location() -> dict:
    return {
        "driver": parsed_url.drivername,
        "host": parsed_url.host,
        "port": parsed_url.port,
        "database": parsed_url.database,
        "schema": DB_SCHEMA,
        "is_local": is_local_db,
        "is_railway_internal": is_railway_internal,
    }

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
