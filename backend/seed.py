import sys
sys.path.append(".")

from app.core.database import SessionLocal
from app.models.school import School
from app.models.user import User, UserRole
from app.models.student import Student
from app.core.security import get_password_hash

db = SessionLocal()

try:
    # ---------- Schools ----------
    school1 = db.query(School).filter_by(code="TCS001").first()
    if not school1:
        school1 = School(
            name="The City School",
            code="TCS001",
            address="Karachi",
            phone="021-1234567",
            email="admin@tcs.edu.pk",
        )
        db.add(school1)

    school2 = db.query(School).filter_by(code="BHS001").first()
    if not school2:
        school2 = School(
            name="Beacon House",
            code="BHS001",
            address="Lahore",
            phone="042-7654321",
            email="admin@bhs.edu.pk",
        )
        db.add(school2)

    db.commit()
    db.refresh(school1)
    db.refresh(school2)

    # ---------- Users ----------
    users_data = [
        {
            "email": "superadmin@nyxion.ai",
            "full_name": "Nyxion Super Admin",
            "role": UserRole.SUPER_ADMIN,
            "school_id": None,
        },
        {
            "email": "admin@tcs.edu.pk",
            "full_name": "TCS Admin",
            "role": UserRole.SCHOOL_ADMIN,
            "school_id": school1.id,
        },
        {
            "email": "admin@bhs.edu.pk",
            "full_name": "BHS Admin",
            "role": UserRole.SCHOOL_ADMIN,
            "school_id": school2.id,
        },
        {
            "email": "teacher@tcs.edu.pk",
            "full_name": "Mr. Ahmed",
            "role": UserRole.TEACHER,
            "school_id": school1.id,
        },
    ]

    for user_data in users_data:
        existing_user = db.query(User).filter_by(email=user_data["email"]).first()
        if not existing_user:
            db.add(
                User(
                    email=user_data["email"],
                    full_name=user_data["full_name"],
                    hashed_password=get_password_hash("admin123"),
                    role=user_data["role"],
                    school_id=user_data["school_id"],
                )
            )
        else:
            existing_user.full_name = user_data["full_name"]
            existing_user.role = user_data["role"]
            existing_user.school_id = user_data["school_id"]
            existing_user.hashed_password = get_password_hash("admin123")
            existing_user.is_active = True

    db.commit()

    # ---------- Students ----------
    students_data = [
        {
            "school_id": school1.id,
            "full_name": "Ali Hassan",
            "father_name": "Hassan Ali",
            "roll_number": "TCS-001",
            "class_name": "8",
            "section": "A",
            "phone": "0300-1234567",
        },
        {
            "school_id": school1.id,
            "full_name": "Fatima Khan",
            "father_name": "Imran Khan",
            "roll_number": "TCS-002",
            "class_name": "8",
            "section": "A",
            "phone": "0301-2345678",
        },
        {
            "school_id": school1.id,
            "full_name": "Umar Farooq",
            "father_name": "Farooq Ahmed",
            "roll_number": "TCS-003",
            "class_name": "9",
            "section": "B",
            "phone": "0302-3456789",
        },
        {
            "school_id": school1.id,
            "full_name": "Zainab Raza",
            "father_name": "Raza Shah",
            "roll_number": "TCS-004",
            "class_name": "9",
            "section": "B",
            "phone": "0303-4567890",
        },
        {
            "school_id": school1.id,
            "full_name": "Bilal Malik",
            "father_name": "Malik Saeed",
            "roll_number": "TCS-005",
            "class_name": "10",
            "section": "A",
            "phone": "0304-5678901",
        },
        {
            "school_id": school2.id,
            "full_name": "Sara Ahmed",
            "father_name": "Ahmed Raza",
            "roll_number": "BHS-001",
            "class_name": "7",
            "section": "A",
            "phone": "0305-6789012",
        },
        {
            "school_id": school2.id,
            "full_name": "Hassan Javed",
            "father_name": "Javed Iqbal",
            "roll_number": "BHS-002",
            "class_name": "7",
            "section": "B",
            "phone": "0306-7890123",
        },
    ]

    for student_data in students_data:
        existing_student = db.query(Student).filter_by(
            roll_number=student_data["roll_number"]
        ).first()
        if not existing_student:
            db.add(Student(**student_data))

    db.commit()

    print("✅ Seed data created or already exists!")
    print("Super Admin: superadmin@nyxion.ai / admin123")
    print("TCS Admin:   admin@tcs.edu.pk / admin123")
    print("BHS Admin:   admin@bhs.edu.pk / admin123")
    print("Teacher:     teacher@tcs.edu.pk / admin123")

except Exception as e:
    db.rollback()
    raise e

finally:
    db.close()
