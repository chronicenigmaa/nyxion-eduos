"""Build a complete, self-consistent demo school in EduOS.

Run from the backend/ directory with DATABASE_URL pointing at the TARGET
database:

    python seed_demo.py --wipe      # DELETES EVERYTHING, then seeds
    python seed_demo.py             # seeds only if the database is empty

WARNING — --wipe TRUNCATEs every EduOS table (users, students, teachers,
schools, results, attendance, fees, ...). There is no undo. EduOS's own config
notes the production database holds a real school's data, so only ever point
this at a database you are certain is disposable. Without --wipe the script
refuses to touch a database that already has users.

EduOS is the system of record for accounts. LearnSpace signs people in by
posting their credentials here and provisions its own row from the response,
so every login created here works on BOTH products. Roll numbers are the join
key between the two, so they are set explicitly on every student.

Seeds: 1 school, 1 super admin, 1 school admin, 3 teachers, 6 students
(2 of them siblings of the demo parent), 1 parent, subjects, class sections,
timetable, coursebooks, assignments, results, attendance, fees and notices.
"""

import argparse
import sys
import uuid
from datetime import date, datetime, timedelta

sys.path.append(".")

from sqlalchemy import text

from app.core.database import (  # noqa: F401
    Base, DB_SCHEMA, SessionLocal, engine, ensure_schema_exists, get_db_location,
)
from app.core.security import get_password_hash
from app.models import (  # noqa: F401 — registers every table on Base.metadata
    School, User, Student, StudentParent, Teacher, Attendance, Fee, Subject,
    ClassSection, Notice, Assignment, Submission, Result, CourseBook,
    TimetableEntry, PasswordResetToken,
)
from app.models.attendance import AttendanceStatus
from app.models.fee import FeeStatus
from app.models.notice import NoticeType
from app.models.school import DEFAULT_FEATURES
from app.models.user import UserRole

PASSWORD = "Demo@123"

# Fixed on purpose. LearnSpace stamps this id onto its own timetable and
# coursebook rows and filters by it, and a user's school_id is overwritten with
# EduOS's value on first sign-in — so both seeders must agree on one id.
# Keep in sync with seed_demo.py in the LearnSpace repo.
DEMO_SCHOOL_ID = uuid.UUID("11111111-2222-3333-4444-555555555555")

SCHOOL = {
    "code": "DEMO001",
    "name": "Nyxion Demo School",
    "address": "12 Shahrah-e-Faisal, Karachi",
    "phone": "021-111-2222",
    "email": "office@demo.edu.pk",
    "package": "elite",
}

SUPER_ADMIN = {"email": "superadmin@nyxion.ai", "full_name": "Nyxion Super Admin"}
SCHOOL_ADMIN = {"email": "admin@demo.edu.pk", "full_name": "Imtiaz Qureshi"}
PARENT = {"email": "parent@demo.edu.pk", "full_name": "Hassan Ali"}

TEACHERS = [
    {"full_name": "Ms. Sara Ahmed", "email": "sara@demo.edu.pk", "subject": "Mathematics",
     "phone": "0300-1111111", "qualification": "MSc Mathematics", "salary": "85000"},
    {"full_name": "Mr. Imran Khan", "email": "imran@demo.edu.pk", "subject": "English",
     "phone": "0300-2222222", "qualification": "MA English", "salary": "78000"},
    {"full_name": "Ms. Ayesha Siddiqui", "email": "ayesha@demo.edu.pk", "subject": "Science",
     "phone": "0300-3333333", "qualification": "MSc Physics", "salary": "82000"},
]

# The first and fourth are the demo parent's children — deliberately in
# different classes so the parent portal shows two distinct timetables.
STUDENTS = [
    {"full_name": "Ali Hassan",    "roll": "DEMO-001", "class_name": "8", "section": "A",
     "father": "Hassan Ali",   "email": "ali@demo.edu.pk",    "parent": True},
    {"full_name": "Fatima Khan",   "roll": "DEMO-002", "class_name": "8", "section": "A",
     "father": "Imran Khan",   "email": "fatima@demo.edu.pk", "parent": False},
    {"full_name": "Bilal Ahmed",   "roll": "DEMO-003", "class_name": "8", "section": "A",
     "father": "Ahmed Raza",   "email": "bilal@demo.edu.pk",  "parent": False},
    {"full_name": "Zainab Hassan", "roll": "DEMO-004", "class_name": "6", "section": "A",
     "father": "Hassan Ali",   "email": "zainab@demo.edu.pk", "parent": True},
    {"full_name": "Hamza Sheikh",  "roll": "DEMO-005", "class_name": "6", "section": "A",
     "father": "Sheikh Anwar", "email": "hamza@demo.edu.pk",  "parent": False},
    {"full_name": "Ayesha Malik",  "roll": "DEMO-006", "class_name": "6", "section": "A",
     "father": "Malik Saeed",  "email": "ayesham@demo.edu.pk", "parent": False},
]

SUBJECT_NAMES = ["Mathematics", "English", "Science"]
CLASSES = [("8", "A"), ("6", "A")]
PERIOD_TIMES = [("08:00", "08:45"), ("08:45", "09:30"), ("09:45", "10:30"), ("10:30", "11:15")]
DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]


def grade_for(percentage: float) -> str:
    for cutoff, letter in ((80, "A+"), (70, "A"), (60, "B"), (50, "C"), (40, "D")):
        if percentage >= cutoff:
            return letter
    return "F"


def wipe(confirm: bool) -> None:
    tables = ", ".join(f'"{DB_SCHEMA}"."{t.name}"' for t in Base.metadata.sorted_tables)
    if not confirm:
        return
    with engine.begin() as conn:
        conn.execute(text(f"TRUNCATE {tables} RESTART IDENTITY CASCADE"))
    print("Wiped every EduOS table.")


def main() -> int:
    parser = argparse.ArgumentParser(description="Seed a full EduOS demo school.")
    parser.add_argument("--wipe", action="store_true",
                        help="DELETE ALL existing data first. Irreversible.")
    parser.add_argument("--allow-public-schema", action="store_true",
                        help="Permit seeding into the 'public' schema. Almost always wrong.")
    args = parser.parse_args()

    location = get_db_location()
    print(f"Target: {location['host']}/{location['database']} schema={location['schema']}")

    # Seeding into "public" silently writes where the deployed app never looks,
    # because it runs with DB_SCHEMA=eduos. That failure is invisible: the
    # script reports success and every login still fails.
    if DB_SCHEMA == "public" and not args.allow_public_schema:
        print(
            "\nRefusing to run against the 'public' schema.\n"
            "EduOS runs with DB_SCHEMA=eduos, so anything seeded into 'public' "
            "is invisible to the app.\n\n"
            "  DATABASE_URL=... DB_SCHEMA=eduos python seed_demo.py --wipe\n\n"
            "Pass --allow-public-schema only if you genuinely mean 'public'.",
            file=sys.stderr,
        )
        return 1

    ensure_schema_exists()
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        existing = db.query(User).count()
        if existing and not args.wipe:
            print(
                f"\nRefusing to seed: {existing} user(s) already exist.\n"
                "Re-run with --wipe to DELETE everything first, or point "
                "DATABASE_URL at an empty database.",
                file=sys.stderr,
            )
            return 1
    finally:
        db.close()

    if args.wipe:
        print(f"\n!! About to DELETE ALL DATA in {location['host']}/{location['database']} "
              f"(schema {location['schema']}).")
        if input("Type the word DELETE to continue: ").strip() != "DELETE":
            print("Aborted. Nothing was changed.")
            return 1
        wipe(True)

    db = SessionLocal()
    try:
        # ── School
        school = School(id=DEMO_SCHOOL_ID, **SCHOOL, features=dict(DEFAULT_FEATURES), is_active=True)
        db.add(school)
        db.flush()

        def make_user(email, full_name, role, school_id):
            user = User(
                email=email, full_name=full_name, role=role, school_id=school_id,
                hashed_password=get_password_hash(PASSWORD),
                is_active=True, must_change_password=False,
            )
            db.add(user)
            return user

        # ── Accounts
        make_user(SUPER_ADMIN["email"], SUPER_ADMIN["full_name"], UserRole.SUPER_ADMIN, None)
        make_user(SCHOOL_ADMIN["email"], SCHOOL_ADMIN["full_name"], UserRole.SCHOOL_ADMIN, school.id)
        parent_user = make_user(PARENT["email"], PARENT["full_name"], UserRole.PARENT, school.id)

        teachers = {}
        for data in TEACHERS:
            teacher = Teacher(
                school_id=school.id, full_name=data["full_name"], email=data["email"],
                phone=data["phone"], subject=data["subject"],
                qualification=data["qualification"], salary=data["salary"],
                date_of_joining=date(2024, 4, 1), is_active=True,
            )
            db.add(teacher)
            make_user(data["email"], data["full_name"], UserRole.TEACHER, school.id)
            teachers[data["subject"]] = teacher
        db.flush()

        students = []
        for data in STUDENTS:
            student = Student(
                school_id=school.id, full_name=data["full_name"], father_name=data["father"],
                roll_number=data["roll"], class_name=data["class_name"], section=data["section"],
                email=data["email"], phone="0300-0000000", address="Karachi",
                date_of_birth=date(2012, 5, 14), is_active=True,
            )
            db.add(student)
            make_user(data["email"], data["full_name"], UserRole.STUDENT, school.id)
            students.append((student, data))
        db.flush()

        # ── Parent → children
        for student, data in students:
            if data["parent"]:
                db.add(StudentParent(parent_user_id=parent_user.id, student_id=student.id))

        # ── Class sections + subjects
        subjects = {}
        for class_name, section in CLASSES:
            homeroom = teachers["Mathematics"] if class_name == "8" else teachers["English"]
            db.add(ClassSection(
                school_id=school.id, class_name=class_name, section=section,
                class_teacher_id=homeroom.id, is_active=True,
            ))
            for name in SUBJECT_NAMES:
                subject = Subject(
                    school_id=school.id, name=name, class_name=class_name, section=section,
                    teacher_id=teachers[name].id, description=f"{name} for class {class_name}",
                    is_active=True,
                )
                db.add(subject)
                subjects[(class_name, name)] = subject
        db.flush()

        # ── Timetable: 4 periods a day, subjects rotating
        for class_name, section in CLASSES:
            for day in DAYS:
                for period, (start, end) in enumerate(PERIOD_TIMES, start=1):
                    name = SUBJECT_NAMES[(period - 1) % len(SUBJECT_NAMES)]
                    db.add(TimetableEntry(
                        school_id=school.id, class_name=class_name, section=section,
                        day=day, period=period, start_time=start, end_time=end,
                        subject_name=name, teacher_name=teachers[name].full_name,
                        room=f"{class_name}{section}-{period}",
                    ))

        # ── Coursebooks
        for class_name, _ in CLASSES:
            for name in SUBJECT_NAMES:
                db.add(CourseBook(
                    school_id=school.id, subject_id=subjects[(class_name, name)].id,
                    title=f"{name} — Class {class_name} Textbook",
                    description=f"Core {name} coursebook for class {class_name}",
                    class_name=class_name, file_url="https://example.com/demo.pdf",
                    file_type="pdf", file_size=1_048_576, is_active=True,
                ))

        # ── Assignments
        today = date.today()
        for class_name, section in CLASSES:
            for offset, name in enumerate(SUBJECT_NAMES):
                db.add(Assignment(
                    school_id=school.id, teacher_id=teachers[name].id,
                    subject_id=subjects[(class_name, name)].id,
                    title=f"{name} Worksheet {offset + 1}",
                    description=f"Complete the {name.lower()} exercises for class {class_name}.",
                    class_name=class_name, section=section, total_marks=50,
                    due_date=datetime.combine(today + timedelta(days=3 + offset * 4), datetime.min.time()),
                ))

        # ── Results, attendance, fees
        marks_cycle = [88, 74, 63, 91, 57, 79]
        for index, (student, data) in enumerate(students):
            for exam_offset, exam_type in enumerate(("Midterm", "Final")):
                for subject_offset, name in enumerate(SUBJECT_NAMES):
                    obtained = marks_cycle[(index + exam_offset + subject_offset) % len(marks_cycle)]
                    db.add(Result(
                        school_id=school.id, student_id=student.id,
                        subject_id=subjects[(data["class_name"], name)].id,
                        subject_name=name, exam_type=exam_type, term="Term 1",
                        class_name=data["class_name"], total_marks=100,
                        marks_obtained=obtained, grade=grade_for(obtained),
                        remarks="Consistent effort." if obtained >= 70 else "Needs more practice.",
                    ))

            # 30 school days of attendance, a couple of absences/lates each.
            marked = 0
            day_offset = 0
            while marked < 30:
                day = today - timedelta(days=day_offset)
                day_offset += 1
                if day.weekday() >= 5:  # skip weekends
                    continue
                marked += 1
                if marked % 13 == 0:
                    status = AttendanceStatus.ABSENT
                elif marked % 7 == 0:
                    status = AttendanceStatus.LATE
                else:
                    status = AttendanceStatus.PRESENT
                db.add(Attendance(
                    school_id=school.id, student_id=student.id, date=day, status=status,
                ))

            for month_offset, month in enumerate(("May", "June", "July")):
                paid = month_offset < 2
                db.add(Fee(
                    school_id=school.id, student_id=student.id, amount=15000,
                    paid_amount=15000 if paid else 0, month=month, year="2026",
                    status=FeeStatus.PAID if paid else FeeStatus.PENDING,
                    due_date=datetime(2026, 5 + month_offset, 10),
                    paid_date=datetime(2026, 5 + month_offset, 5) if paid else None,
                ))

        # ── Notices
        for title, message, notice_type in (
            ("Parent-Teacher Meeting", "PTM for all classes on Saturday, 9am to 1pm.", NoticeType.GENERAL),
            ("Term 1 Results Published", "Term 1 results are now visible in the portal.", NoticeType.EXAM),
            ("July Fees Due", "July fees are due on the 10th. Please pay on time.", NoticeType.FEE),
        ):
            db.add(Notice(school_id=school.id, title=title, message=message, type=notice_type))

        db.commit()

        print(f"""
Seeded "{SCHOOL['name']}" ({SCHOOL['code']}).

  {len(STUDENTS)} students, {len(TEACHERS)} teachers, 1 parent linked to 2 children
  subjects, class sections, timetable, coursebooks, assignments,
  results (Midterm + Final), 30 days attendance, 3 months fees, 3 notices

All passwords: {PASSWORD}

  Super admin   {SUPER_ADMIN['email']}
  School admin  {SCHOOL_ADMIN['email']}
  Parent        {PARENT['email']}  (Ali Hassan DEMO-001, Zainab Hassan DEMO-004)
  Teachers      {', '.join(t['email'] for t in TEACHERS)}
  Students      {', '.join(s['email'] for s in STUDENTS)}

These logins work on LearnSpace too once EDUOS_API_URL points at this EduOS.
""")
        return 0
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
