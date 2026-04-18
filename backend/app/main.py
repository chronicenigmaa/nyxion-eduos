from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.router import api_router
from app.core.database import engine
from app.models import School, User, Student
from app.core.database import Base
from app.core.database import SessionLocal
from app.models.school import DEFAULT_FEATURES
from app.models.user import UserRole
from app.core.security import get_password_hash
from sqlalchemy import inspect, text
import json

Base.metadata.create_all(bind=engine)

DEMO_PASSWORD = "admin123"
DEMO_SCHOOLS = [
    {
        "code": "TCS001",
        "name": "The City School",
        "address": "Karachi",
        "phone": "021-1234567",
        "email": "admin@tcs.edu.pk",
        "package": "growth",
    },
    {
        "code": "BHS001",
        "name": "Beacon House",
        "address": "Lahore",
        "phone": "042-7654321",
        "email": "admin@bhs.edu.pk",
        "package": "starter",
    },
]
DEMO_USERS = [
    {
        "email": "superadmin@nyxion.ai",
        "full_name": "Nyxion Super Admin",
        "role": UserRole.SUPER_ADMIN,
        "school_code": None,
    },
    {
        "email": "admin@tcs.edu.pk",
        "full_name": "TCS Admin",
        "role": UserRole.SCHOOL_ADMIN,
        "school_code": "TCS001",
    },
    {
        "email": "admin@bhs.edu.pk",
        "full_name": "BHS Admin",
        "role": UserRole.SCHOOL_ADMIN,
        "school_code": "BHS001",
    },
    {
        "email": "teacher@tcs.edu.pk",
        "full_name": "Mr. Ahmed",
        "role": UserRole.TEACHER,
        "school_code": "TCS001",
    },
]


def ensure_school_schema():
    inspector = inspect(engine)
    if "schools" not in inspector.get_table_names():
        return

    existing_columns = {column["name"] for column in inspector.get_columns("schools")}
    default_features_json = json.dumps(DEFAULT_FEATURES)

    with engine.begin() as conn:
        if "code" not in existing_columns:
            conn.execute(text("ALTER TABLE schools ADD COLUMN code VARCHAR(50)"))
            conn.execute(text("""
                UPDATE schools
                SET code = CONCAT(
                    COALESCE(NULLIF(UPPER(LEFT(REGEXP_REPLACE(name, '[^A-Za-z0-9]+', '', 'g'), 6)), ''), 'SCH'),
                    '-',
                    RIGHT(REPLACE(CAST(id AS TEXT), '-', ''), 4)
                )
                WHERE code IS NULL
            """))

        if "package" not in existing_columns:
            conn.execute(text("ALTER TABLE schools ADD COLUMN package VARCHAR(20) DEFAULT 'starter'"))

        if "features" not in existing_columns:
            conn.execute(text("ALTER TABLE schools ADD COLUMN features JSON"))

        if "is_active" not in existing_columns:
            conn.execute(text("ALTER TABLE schools ADD COLUMN is_active BOOLEAN DEFAULT TRUE"))

        conn.execute(text("UPDATE schools SET package = 'starter' WHERE package IS NULL"))
        conn.execute(text("UPDATE schools SET is_active = TRUE WHERE is_active IS NULL"))
        conn.execute(
            text("UPDATE schools SET features = CAST(:features AS JSON) WHERE features IS NULL"),
            {"features": default_features_json},
        )


def ensure_demo_data():
    db = SessionLocal()
    try:
        schools_by_code = {}
        for school_data in DEMO_SCHOOLS:
            school = db.query(School).filter(School.code == school_data["code"]).first()
            if not school:
                school = School(
                    **school_data,
                    features=dict(DEFAULT_FEATURES),
                )
                db.add(school)
                db.flush()
            else:
                school.name = school_data["name"]
                school.address = school_data["address"]
                school.phone = school_data["phone"]
                school.email = school_data["email"]
                school.package = school_data["package"]
                school.is_active = True
                school.features = dict(school.features or DEFAULT_FEATURES)
            schools_by_code[school_data["code"]] = school

        for user_data in DEMO_USERS:
            school = schools_by_code.get(user_data["school_code"]) if user_data["school_code"] else None
            user = db.query(User).filter(User.email == user_data["email"]).first()
            hashed_password = get_password_hash(DEMO_PASSWORD)
            if not user:
                user = User(
                    email=user_data["email"],
                    full_name=user_data["full_name"],
                    hashed_password=hashed_password,
                    role=user_data["role"],
                    school_id=school.id if school else None,
                    is_active=True,
                )
                db.add(user)
            else:
                user.full_name = user_data["full_name"]
                user.role = user_data["role"]
                user.school_id = school.id if school else None
                user.hashed_password = hashed_password
                user.is_active = True

        db.commit()
    finally:
        db.close()


ensure_school_schema()
ensure_demo_data()

app = FastAPI(
    title="Nyxion EduOS API",
    description="AI-native School Operating System",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://nyxion-eduos.vercel.app",
        "https://*.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")

@app.get("/health")
def health():
    return {"status": "ok", "app": "Nyxion EduOS"}
