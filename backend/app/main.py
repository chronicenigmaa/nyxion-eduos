from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.router import api_router
from app.core.database import engine
from app.models import School, User, Student
from app.core.database import Base
from app.core.database import SessionLocal
from app.core.database import get_db_location
from app.core.config import settings
from app.models.school import DEFAULT_FEATURES
from app.models.school import normalize_feature_overrides
from app.models.user import UserRole
from app.models.teacher import Teacher
from app.models.subject import Subject
from app.models.class_section import ClassSection
from app.models.fee import Fee, FeeStatus
from app.core.security import get_password_hash
from sqlalchemy import inspect, text
import json
import logging
from datetime import datetime

logger = logging.getLogger("nyxion")
if not logger.handlers:
    logging.basicConfig(level=logging.INFO)

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


def ensure_columns(table_name, column_specs):
    inspector = inspect(engine)
    if table_name not in inspector.get_table_names():
        return

    existing_columns = {column["name"] for column in inspector.get_columns(table_name)}
    with engine.begin() as conn:
        for column_name, ddl in column_specs.items():
            if column_name not in existing_columns:
                conn.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {ddl}"))


def get_postgres_enum_labels(table_name, column_name):
    query = text("""
        SELECT e.enumlabel
        FROM information_schema.columns c
        JOIN pg_type t ON t.typname = c.udt_name
        JOIN pg_enum e ON e.enumtypid = t.oid
        WHERE c.table_name = :table_name
          AND c.column_name = :column_name
        ORDER BY e.enumsortorder
    """)
    with engine.connect() as conn:
        return [row[0] for row in conn.execute(query, {"table_name": table_name, "column_name": column_name}).fetchall()]


def get_fee_pending_value():
    labels = get_postgres_enum_labels("fees", "status")
    if not labels:
        return "pending"

    for candidate in ("pending", "PENDING", "Pending"):
        if candidate in labels:
            return candidate
    return labels[0]


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
        conn.execute(text("UPDATE schools SET created_at = NOW() WHERE created_at IS NULL"))
        conn.execute(
            text("UPDATE schools SET features = CAST(:features AS JSON) WHERE features IS NULL"),
            {"features": default_features_json},
        )


def ensure_core_schema():
    ensure_columns(
        "users",
        {
            "must_change_password": "BOOLEAN DEFAULT FALSE",
        },
    )
    ensure_columns(
        "students",
        {
            "father_name": "VARCHAR(255)",
            "class_name": "VARCHAR(50)",
            "section": "VARCHAR(10)",
            "date_of_birth": "DATE",
            "phone": "VARCHAR(50)",
            "address": "TEXT",
            "is_active": "BOOLEAN DEFAULT TRUE",
            "created_at": "TIMESTAMP",
            "email": "VARCHAR(255)",
        },
    )
    ensure_columns(
        "teachers",
        {
            "email": "VARCHAR(255)",
            "phone": "VARCHAR(50)",
            "subject": "VARCHAR(100)",
            "qualification": "VARCHAR(255)",
            "date_of_joining": "DATE",
            "salary": "VARCHAR(50)",
            "is_active": "BOOLEAN DEFAULT TRUE",
            "created_at": "TIMESTAMP",
        },
    )
    ensure_columns(
        "subjects",
        {
            "class_name": "VARCHAR(50)",
            "section": "VARCHAR(20)",
            "teacher_id": "UUID",
            "description": "TEXT",
            "is_active": "BOOLEAN DEFAULT TRUE",
            "created_at": "TIMESTAMP",
        },
    )
    ensure_columns(
        "fees",
        {
            "month": "VARCHAR(20)",
            "year": "VARCHAR(10)",
            "status": "VARCHAR(20) DEFAULT 'pending'",
            "paid_amount": "DOUBLE PRECISION DEFAULT 0",
            "due_date": "TIMESTAMP",
            "paid_date": "TIMESTAMP",
            "remarks": "TEXT",
            "created_at": "TIMESTAMP",
        },
    )

    pending_value = get_fee_pending_value()

    with engine.begin() as conn:
        conn.execute(text("UPDATE users SET must_change_password = FALSE WHERE must_change_password IS NULL"))
        conn.execute(text("UPDATE students SET is_active = TRUE WHERE is_active IS NULL"))
        conn.execute(text("UPDATE teachers SET is_active = TRUE WHERE is_active IS NULL"))
        conn.execute(text("UPDATE subjects SET is_active = TRUE WHERE is_active IS NULL"))
        conn.execute(text("UPDATE fees SET status = :status WHERE status IS NULL"), {"status": pending_value})
        conn.execute(text("UPDATE fees SET paid_amount = 0 WHERE paid_amount IS NULL"))
        conn.execute(text("UPDATE students SET created_at = NOW() WHERE created_at IS NULL"))
        conn.execute(text("UPDATE teachers SET created_at = NOW() WHERE created_at IS NULL"))
        conn.execute(text("UPDATE subjects SET created_at = NOW() WHERE created_at IS NULL"))
        conn.execute(text("UPDATE fees SET created_at = NOW() WHERE created_at IS NULL"))


def ensure_demo_data():
    db = SessionLocal()
    try:
        schools_by_code = {}
        for school_data in DEMO_SCHOOLS:
            school = db.query(School).filter(School.code == school_data["code"]).first()
            if not school:
                school = School(
                    **school_data,
                    features={},
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
                school.features = normalize_feature_overrides(school.package, school.features)
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


def ensure_demo_records():
    db = SessionLocal()
    try:
        school_map = {
            school.code: school
            for school in db.query(School).filter(School.code.in_(["TCS001", "BHS001"])).all()
        }
        if "TCS001" not in school_map or "BHS001" not in school_map:
            return

        demo_teachers = [
            {"school_code": "TCS001", "full_name": "Mr. Ahmed Khan", "email": "ahmed@tcs.edu.pk", "phone": "0300-1111111", "subject": "Mathematics", "qualification": "MSc Mathematics", "salary": "55000"},
            {"school_code": "TCS001", "full_name": "Ms. Sara Ali", "email": "sara@tcs.edu.pk", "phone": "0300-2222222", "subject": "English", "qualification": "MA English", "salary": "50000"},
            {"school_code": "BHS001", "full_name": "Mr. Hassan Javed", "email": "hassan@bhs.edu.pk", "phone": "0301-1111111", "subject": "Mathematics", "qualification": "MSc Mathematics", "salary": "56000"},
        ]
        for teacher_data in demo_teachers:
            school = school_map[teacher_data["school_code"]]
            teacher = db.query(Teacher).filter(
                Teacher.school_id == school.id,
                Teacher.email == teacher_data["email"],
            ).first()
            if not teacher:
                db.add(
                    Teacher(
                        school_id=school.id,
                        full_name=teacher_data["full_name"],
                        email=teacher_data["email"],
                        phone=teacher_data["phone"],
                        subject=teacher_data["subject"],
                        qualification=teacher_data["qualification"],
                        salary=teacher_data["salary"],
                        is_active=True,
                    )
                )

        demo_students = [
            {"school_code": "TCS001", "full_name": "Ali Hassan", "father_name": "Hassan Ali", "roll_number": "TCS-001", "class_name": "8", "section": "A", "phone": "0300-1234567", "address": "Karachi"},
            {"school_code": "TCS001", "full_name": "Fatima Khan", "father_name": "Imran Khan", "roll_number": "TCS-002", "class_name": "8", "section": "A", "phone": "0301-2345678", "address": "Karachi"},
            {"school_code": "TCS001", "full_name": "Umar Farooq", "father_name": "Farooq Ahmed", "roll_number": "TCS-003", "class_name": "9", "section": "B", "phone": "0302-3456789", "address": "Karachi"},
            {"school_code": "BHS001", "full_name": "Sara Ahmed", "father_name": "Ahmed Raza", "roll_number": "BHS-001", "class_name": "7", "section": "A", "phone": "0305-6789012", "address": "Lahore"},
        ]
        for student_data in demo_students:
            school = school_map[student_data["school_code"]]
            student = db.query(Student).filter(
                Student.school_id == school.id,
                Student.roll_number == student_data["roll_number"],
            ).first()
            if not student:
                db.add(
                    Student(
                        school_id=school.id,
                        full_name=student_data["full_name"],
                        father_name=student_data["father_name"],
                        roll_number=student_data["roll_number"],
                        class_name=student_data["class_name"],
                        section=student_data["section"],
                        phone=student_data["phone"],
                        address=student_data["address"],
                        is_active=True,
                    )
                )

        db.commit()

        teachers_by_school = {}
        for school_code, school in school_map.items():
            teachers_by_school[school_code] = db.query(Teacher).filter(
                Teacher.school_id == school.id,
                Teacher.is_active == True,
            ).all()

        demo_subjects = [
            {"school_code": "TCS001", "name": "Mathematics", "class_name": "8", "description": "Core mathematics curriculum"},
            {"school_code": "TCS001", "name": "English", "class_name": "8", "description": "Language and composition"},
            {"school_code": "BHS001", "name": "Mathematics", "class_name": "7", "description": "Core mathematics curriculum"},
        ]
        for subject_data in demo_subjects:
            school = school_map[subject_data["school_code"]]
            subject = db.query(Subject).filter(
                Subject.school_id == school.id,
                Subject.name == subject_data["name"],
                Subject.class_name == subject_data["class_name"],
            ).first()
            if not subject:
                teacher_id = teachers_by_school[subject_data["school_code"]][0].id if teachers_by_school[subject_data["school_code"]] else None
                db.add(
                    Subject(
                        school_id=school.id,
                        name=subject_data["name"],
                        class_name=subject_data["class_name"],
                        description=subject_data["description"],
                        teacher_id=teacher_id,
                        is_active=True,
                    )
                )

        db.commit()

        all_students = db.query(Student).filter(Student.is_active == True).all()
        for student in all_students:
            roll_number = student.roll_number or ""
            is_paid_demo = roll_number.endswith("1")
            fee = db.query(Fee).filter(
                Fee.school_id == student.school_id,
                Fee.student_id == student.id,
                Fee.month == "April",
                Fee.year == "2026",
            ).first()
            if not fee:
                db.add(
                    Fee(
                        school_id=student.school_id,
                        student_id=student.id,
                        amount=12000,
                        paid_amount=12000 if is_paid_demo else 0,
                        month="April",
                        year="2026",
                        status=FeeStatus.PAID if is_paid_demo else FeeStatus.PENDING,
                        created_at=datetime.utcnow(),
                    )
                )

        db.commit()
    finally:
        db.close()

app = FastAPI(
    title="Nyxion EduOS API",
    description="AI-native School Operating System",
    version="1.0.0",
    redirect_slashes=False
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://nyxion-eduos.vercel.app",
    ],
    # Keep this broad in production until deployment domains stabilize.
    allow_origin_regex=r"https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")


def initialize_database():
    location = get_db_location()
    logger.info(
        "DB target env=%s driver=%s host=%s port=%s database=%s local=%s",
        settings.ENV,
        location["driver"],
        location["host"],
        location["port"],
        location["database"],
        location["is_local"],
    )
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
    logger.info("DB connectivity check passed")

    Base.metadata.create_all(bind=engine)
    ensure_school_schema()
    ensure_core_schema()
    if settings.ENV.lower() != "production":
        ensure_demo_data()
        ensure_demo_records()
        logger.info("Demo seed initialization completed")
    else:
        logger.info("Skipping demo seed initialization in production")
    logger.info("DB schema/data initialization completed")


@app.on_event("startup")
def on_startup():
    initialize_database()

@app.get("/health")
def health():
    return {"status": "ok", "app": "Nyxion EduOS"}
