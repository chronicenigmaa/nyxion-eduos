import sys
sys.path.append(".")
from app.core.database import SessionLocal
from app.models.school import School
from app.models.user import User, UserRole
from app.models.student import Student
from app.models.teacher import Teacher
from app.models.subject import Subject
from app.models.attendance import Attendance, AttendanceStatus
from app.models.fee import Fee, FeeStatus
from app.models.notice import Notice, NoticeType
from app.models.assignment import Assignment, AssignmentStatus
from app.models.submission import Submission, SubmissionStatus
from app.models.result import Result
from app.models.coursebook import CourseBook
from app.models.timetable import TimetableEntry
from app.core.security import get_password_hash
from datetime import datetime, date, timedelta
import uuid

db = SessionLocal()

print("Wiping existing data...")
db.query(TimetableEntry).delete()
db.query(CourseBook).delete()
db.query(Result).delete()
db.query(Submission).delete()
db.query(Assignment).delete()
db.query(Notice).delete()
db.query(Fee).delete()
db.query(Attendance).delete()
db.query(Subject).delete()
db.query(Teacher).delete()
db.query(Student).delete()
db.query(User).delete()
db.query(School).delete()
db.commit()

print("Creating schools...")
school1 = School(name="The City School", code="TCS001", address="Karachi, Pakistan", phone="021-1234567", email="admin@tcs.edu.pk")
school2 = School(name="Beacon House", code="BHS001", address="Lahore, Pakistan", phone="042-7654321", email="admin@bhs.edu.pk")
db.add_all([school1, school2])
db.commit()

print("Creating users...")
super_admin = User(email="superadmin@nyxion.ai", full_name="Nyxion Super Admin", hashed_password=get_password_hash("admin123"), role=UserRole.SUPER_ADMIN)
admin1 = User(email="admin@tcs.edu.pk", full_name="TCS Admin", hashed_password=get_password_hash("admin123"), role=UserRole.SCHOOL_ADMIN, school_id=school1.id)
admin2 = User(email="admin@bhs.edu.pk", full_name="BHS Admin", hashed_password=get_password_hash("admin123"), role=UserRole.SCHOOL_ADMIN, school_id=school2.id)
teacher_user = User(email="teacher@tcs.edu.pk", full_name="Mr. Ahmed", hashed_password=get_password_hash("admin123"), role=UserRole.TEACHER, school_id=school1.id)
db.add_all([super_admin, admin1, admin2, teacher_user])
db.commit()

print("Creating teachers...")
teachers = [
    Teacher(school_id=school1.id, full_name="Mr. Ahmed Khan", email="ahmed@tcs.edu.pk", phone="0300-1111111", subject="Mathematics", qualification="MSc Mathematics", salary="55000"),
    Teacher(school_id=school1.id, full_name="Ms. Sara Ali", email="sara@tcs.edu.pk", phone="0300-2222222", subject="English", qualification="MA English", salary="50000"),
    Teacher(school_id=school1.id, full_name="Mr. Usman Raza", email="usman@tcs.edu.pk", phone="0300-3333333", subject="Science", qualification="MSc Physics", salary="52000"),
    Teacher(school_id=school1.id, full_name="Ms. Fatima Shah", email="fatima@tcs.edu.pk", phone="0300-4444444", subject="Urdu", qualification="MA Urdu", salary="48000"),
    Teacher(school_id=school1.id, full_name="Mr. Bilal Malik", email="bilal@tcs.edu.pk", phone="0300-5555555", subject="Computer Science", qualification="BS Computer Science", salary="58000"),
    Teacher(school_id=school1.id, full_name="Ms. Ayesha Noor", email="ayesha@tcs.edu.pk", phone="0300-6666666", subject="Islamiat", qualification="MA Islamiat", salary="45000"),
    Teacher(school_id=school2.id, full_name="Mr. Hassan Javed", email="hassan@bhs.edu.pk", phone="0301-1111111", subject="Mathematics", qualification="MSc Mathematics", salary="56000"),
    Teacher(school_id=school2.id, full_name="Ms. Zainab Iqbal", email="zainab@bhs.edu.pk", phone="0301-2222222", subject="English", qualification="MA English", salary="51000"),
]
db.add_all(teachers)
db.commit()

print("Creating students...")
students_tcs = [
    Student(school_id=school1.id, full_name="Ali Hassan", father_name="Hassan Ali", roll_number="TCS-001", class_name="8", section="A", phone="0300-1234567", address="Karachi"),
    Student(school_id=school1.id, full_name="Fatima Khan", father_name="Imran Khan", roll_number="TCS-002", class_name="8", section="A", phone="0301-2345678", address="Karachi"),
    Student(school_id=school1.id, full_name="Umar Farooq", father_name="Farooq Ahmed", roll_number="TCS-003", class_name="8", section="A", phone="0302-3456789", address="Karachi"),
    Student(school_id=school1.id, full_name="Zainab Raza", father_name="Raza Shah", roll_number="TCS-004", class_name="8", section="B", phone="0303-4567890", address="Karachi"),
    Student(school_id=school1.id, full_name="Bilal Malik", father_name="Malik Saeed", roll_number="TCS-005", class_name="8", section="B", phone="0304-5678901", address="Karachi"),
    Student(school_id=school1.id, full_name="Sana Tariq", father_name="Tariq Mahmood", roll_number="TCS-006", class_name="9", section="A", phone="0305-6789012", address="Karachi"),
    Student(school_id=school1.id, full_name="Hamza Sheikh", father_name="Sheikh Anwar", roll_number="TCS-007", class_name="9", section="A", phone="0306-7890123", address="Karachi"),
    Student(school_id=school1.id, full_name="Nadia Hussain", father_name="Hussain Baig", roll_number="TCS-008", class_name="9", section="B", phone="0307-8901234", address="Karachi"),
    Student(school_id=school1.id, full_name="Kamran Akhtar", father_name="Akhtar Nawaz", roll_number="TCS-009", class_name="10", section="A", phone="0308-9012345", address="Karachi"),
    Student(school_id=school1.id, full_name="Rabia Asif", father_name="Asif Mehmood", roll_number="TCS-010", class_name="10", section="A", phone="0309-0123456", address="Karachi"),
]
students_bhs = [
    Student(school_id=school2.id, full_name="Sara Ahmed", father_name="Ahmed Raza", roll_number="BHS-001", class_name="7", section="A", phone="0305-6789012", address="Lahore"),
    Student(school_id=school2.id, full_name="Hassan Javed", father_name="Javed Iqbal", roll_number="BHS-002", class_name="7", section="B", phone="0306-7890123", address="Lahore"),
    Student(school_id=school2.id, full_name="Maryam Butt", father_name="Butt Sahib", roll_number="BHS-003", class_name="8", section="A", phone="0307-8901234", address="Lahore"),
]
db.add_all(students_tcs + students_bhs)
db.commit()

print("Creating subjects...")
subjects = [
    Subject(school_id=school1.id, name="Mathematics", class_name="8", teacher_id=teachers[0].id),
    Subject(school_id=school1.id, name="English", class_name="8", teacher_id=teachers[1].id),
    Subject(school_id=school1.id, name="Science", class_name="8", teacher_id=teachers[2].id),
    Subject(school_id=school1.id, name="Urdu", class_name="8", teacher_id=teachers[3].id),
    Subject(school_id=school1.id, name="Computer Science", class_name="8", teacher_id=teachers[4].id),
    Subject(school_id=school1.id, name="Islamiat", class_name="8", teacher_id=teachers[5].id),
    Subject(school_id=school1.id, name="Mathematics", class_name="9", teacher_id=teachers[0].id),
    Subject(school_id=school1.id, name="English", class_name="9", teacher_id=teachers[1].id),
    Subject(school_id=school1.id, name="Mathematics", class_name="10", teacher_id=teachers[0].id),
    Subject(school_id=school1.id, name="English", class_name="10", teacher_id=teachers[1].id),
]
db.add_all(subjects)
db.commit()

print("Creating attendance...")
today = date.today()
attendance_records = []
for i in range(7):
    att_date = today - timedelta(days=i)
    for student in students_tcs:
        import random
        status_choices = [AttendanceStatus.PRESENT] * 8 + [AttendanceStatus.ABSENT] + [AttendanceStatus.LATE]
        status = random.choice(status_choices)
        attendance_records.append(Attendance(
            school_id=school1.id,
            student_id=student.id,
            date=att_date,
            status=status
        ))
db.add_all(attendance_records)
db.commit()

print("Creating fees...")
months = ["January", "February", "March", "April"]
fees = []
for student in students_tcs:
    for i, month in enumerate(months):
        if i < 3:
            status = FeeStatus.PAID
            paid_amount = 5000.0
        else:
            status = FeeStatus.PENDING
            paid_amount = 0.0
        fees.append(Fee(
            school_id=school1.id,
            student_id=student.id,
            amount=5000.0,
            paid_amount=paid_amount,
            month=month,
            year="2026",
            status=status,
            due_date=datetime(2026, i+1, 10),
        ))
db.add_all(fees)
db.commit()

print("Creating notices...")
notices = [
    Notice(school_id=school1.id, title="Parent-Teacher Meeting", message="Dear Parents,\n\nThis is to inform you that a Parent-Teacher Meeting will be held on Saturday, 20th April 2026 at 10:00 AM in the school auditorium.\n\nKindly ensure your attendance.\n\nRegards,\nTCS Administration", type=NoticeType.GENERAL, sent_via_whatsapp=True),
    Notice(school_id=school1.id, title="Fee Reminder — April 2026", message="Dear Parents,\n\nThis is a reminder that the fee for April 2026 is due by 10th April. Please ensure timely payment to avoid late charges.\n\nRegards,\nAccounts Department", type=NoticeType.FEE, sent_via_whatsapp=True),
    Notice(school_id=school1.id, title="Mid-Term Examinations Schedule", message="Dear Students and Parents,\n\nMid-term examinations will commence from 25th April 2026. The detailed schedule will be shared by class teachers.\n\nPlease ensure students are well prepared.\n\nRegards,\nAcademic Department", type=NoticeType.EXAM, sent_via_whatsapp=False),
    Notice(school_id=school1.id, title="Eid Holiday Announcement", message="Dear Students and Parents,\n\nSchool will remain closed from 28th March to 5th April on account of Eid-ul-Fitr holidays.\n\nEid Mubarak!\n\nRegards,\nTCS Administration", type=NoticeType.HOLIDAY, sent_via_whatsapp=True),
]
db.add_all(notices)
db.commit()

print("Creating assignments...")
assignments = [
    Assignment(school_id=school1.id, teacher_id=teachers[0].id, title="Mathematics Chapter 3 — Algebra", description="Solve all exercises from Chapter 3. Show complete working for each question.\n\n1. Simplify: 3x + 2y - x + 4y\n2. Solve for x: 2x + 5 = 15\n3. Find the value of x and y: x + y = 10, x - y = 4\n4. Expand: (a + b)²\n5. Factorise: x² + 5x + 6", class_name="8", section="A", total_marks=20, due_date=datetime.now() + timedelta(days=5), status=AssignmentStatus.PUBLISHED),
    Assignment(school_id=school1.id, teacher_id=teachers[1].id, title="English Essay — My School", description="Write a descriptive essay of 300-400 words on the topic 'My School'. Your essay should include:\n\n- Introduction about your school\n- The facilities available\n- Your favourite part of school\n- Conclusion\n\nPay attention to grammar, spelling, and punctuation.", class_name="8", section="A", total_marks=25, due_date=datetime.now() + timedelta(days=3), status=AssignmentStatus.PUBLISHED),
    Assignment(school_id=school1.id, teacher_id=teachers[2].id, title="Science Lab Report — Photosynthesis", description="Write a complete lab report on the photosynthesis experiment conducted in class.\n\nYour report must include:\n1. Aim of the experiment\n2. Materials used\n3. Procedure\n4. Observations\n5. Conclusion\n6. Diagram of the setup", class_name="9", section="A", total_marks=30, due_date=datetime.now() + timedelta(days=7), status=AssignmentStatus.PUBLISHED),
]
db.add_all(assignments)
db.commit()

print("Creating submissions...")
submissions = [
    Submission(school_id=school1.id, assignment_id=assignments[0].id, student_id=students_tcs[0].id, content="1. 2x + 6y\n2. x = 5\n3. x = 7, y = 3\n4. a² + 2ab + b²\n5. (x+2)(x+3)", status=SubmissionStatus.GRADED, marks_obtained=18, feedback="Excellent work! All steps shown clearly.", submitted_at=datetime.now() - timedelta(days=1), graded_at=datetime.now()),
    Submission(school_id=school1.id, assignment_id=assignments[0].id, student_id=students_tcs[1].id, content="1. 2x + 6y\n2. x = 5\n3. x = 7, y = 3\n4. a² + 2ab + b²\n5. (x+3)(x+2)", status=SubmissionStatus.GRADED, marks_obtained=16, feedback="Good effort. Be careful with factorisation steps.", submitted_at=datetime.now() - timedelta(hours=12), graded_at=datetime.now()),
    Submission(school_id=school1.id, assignment_id=assignments[0].id, student_id=students_tcs[2].id, content="1. 2x + 6y\n2. x = 4\n3. x = 6, y = 4\n4. a² + b²\n5. (x+2)(x+3)", status=SubmissionStatus.SUBMITTED, submitted_at=datetime.now() - timedelta(hours=3)),
    Submission(school_id=school1.id, assignment_id=assignments[1].id, student_id=students_tcs[0].id, content="My School\n\nMy school, The City School, is one of the finest educational institutions in Karachi. It was established with the aim of providing quality education to students.\n\nOur school has excellent facilities including a well-stocked library, computer lab, science labs, and a large playground. The classrooms are air-conditioned and equipped with modern teaching aids.\n\nMy favourite part of school is the science lab where we conduct exciting experiments. The teachers are very knowledgeable and always ready to help.\n\nIn conclusion, I am proud to be a student of The City School and look forward to learning more every day.", status=SubmissionStatus.SUBMITTED, submitted_at=datetime.now() - timedelta(hours=6)),
]
db.add_all(submissions)
db.commit()

print("Creating results...")
results = []
subjects_list = ["Mathematics", "English", "Science", "Urdu", "Islamiat"]
marks_data = {
    students_tcs[0].id: [88, 92, 85, 90, 95],
    students_tcs[1].id: [75, 82, 78, 85, 88],
    students_tcs[2].id: [65, 70, 72, 68, 75],
    students_tcs[3].id: [90, 88, 92, 85, 91],
    students_tcs[4].id: [55, 60, 58, 62, 70],
}
for student_id, marks in marks_data.items():
    student = next(s for s in students_tcs if s.id == student_id)
    for i, (subject, mark) in enumerate(zip(subjects_list, marks)):
        pct = mark
        if pct >= 90: grade = 'A+'
        elif pct >= 80: grade = 'A'
        elif pct >= 70: grade = 'B'
        elif pct >= 60: grade = 'C'
        elif pct >= 50: grade = 'D'
        else: grade = 'F'
        results.append(Result(
            school_id=school1.id,
            student_id=student_id,
            subject_name=subject,
            exam_type="midterm",
            term="Term 1",
            class_name=student.class_name,
            total_marks=100,
            marks_obtained=mark,
            grade=grade,
        ))
db.add_all(results)
db.commit()

print("Creating course books...")
coursebooks = [
    CourseBook(school_id=school1.id, title="Mathematics Grade 8 — Punjab Textbook", description="Official Punjab Textbook Board Mathematics book for Grade 8", class_name="8", file_url="https://drive.google.com/file/d/example1", file_type="PDF", uploaded_by=admin1.id),
    CourseBook(school_id=school1.id, title="English Grade 8 — Oxford", description="Oxford English textbook for Grade 8 students", class_name="8", file_url="https://drive.google.com/file/d/example2", file_type="PDF", uploaded_by=admin1.id),
    CourseBook(school_id=school1.id, title="General Science Grade 8", description="PTB General Science for Grade 8", class_name="8", file_url="https://drive.google.com/file/d/example3", file_type="PDF", uploaded_by=admin1.id),
    CourseBook(school_id=school1.id, title="Mathematics Grade 9 — PTB", description="Punjab Textbook Board Mathematics for Grade 9", class_name="9", file_url="https://drive.google.com/file/d/example4", file_type="PDF", uploaded_by=admin1.id),
    CourseBook(school_id=school1.id, title="Physics Grade 9", description="PTB Physics textbook for Grade 9", class_name="9", file_url="https://drive.google.com/file/d/example5", file_type="PDF", uploaded_by=admin1.id),
    CourseBook(school_id=school1.id, title="Chapter 3 Notes — Algebra", description="Teacher notes for Chapter 3 Algebra", class_name="8", file_url="https://drive.google.com/file/d/example6", file_type="Notes", uploaded_by=admin1.id),
]
db.add_all(coursebooks)
db.commit()

print("Creating timetable...")
timetable_entries = [
    TimetableEntry(school_id=school1.id, class_name="8", section="A", day="Monday", period=1, start_time="08:00", end_time="08:45", subject_name="Mathematics", teacher_name="Mr. Ahmed Khan", room="101"),
    TimetableEntry(school_id=school1.id, class_name="8", section="A", day="Monday", period=2, start_time="08:45", end_time="09:30", subject_name="English", teacher_name="Ms. Sara Ali", room="101"),
    TimetableEntry(school_id=school1.id, class_name="8", section="A", day="Monday", period=3, start_time="09:30", end_time="10:15", subject_name="Science", teacher_name="Mr. Usman Raza", room="Lab 1"),
    TimetableEntry(school_id=school1.id, class_name="8", section="A", day="Monday", period=4, start_time="10:30", end_time="11:15", subject_name="Urdu", teacher_name="Ms. Fatima Shah", room="101"),
    TimetableEntry(school_id=school1.id, class_name="8", section="A", day="Monday", period=5, start_time="11:15", end_time="12:00", subject_name="Islamiat", teacher_name="Ms. Ayesha Noor", room="101"),
    TimetableEntry(school_id=school1.id, class_name="8", section="A", day="Tuesday", period=1, start_time="08:00", end_time="08:45", subject_name="English", teacher_name="Ms. Sara Ali", room="101"),
    TimetableEntry(school_id=school1.id, class_name="8", section="A", day="Tuesday", period=2, start_time="08:45", end_time="09:30", subject_name="Mathematics", teacher_name="Mr. Ahmed Khan", room="101"),
    TimetableEntry(school_id=school1.id, class_name="8", section="A", day="Tuesday", period=3, start_time="09:30", end_time="10:15", subject_name="Computer Science", teacher_name="Mr. Bilal Malik", room="Lab 2"),
    TimetableEntry(school_id=school1.id, class_name="8", section="A", day="Tuesday", period=4, start_time="10:30", end_time="11:15", subject_name="Science", teacher_name="Mr. Usman Raza", room="Lab 1"),
    TimetableEntry(school_id=school1.id, class_name="8", section="A", day="Wednesday", period=1, start_time="08:00", end_time="08:45", subject_name="Mathematics", teacher_name="Mr. Ahmed Khan", room="101"),
    TimetableEntry(school_id=school1.id, class_name="8", section="A", day="Wednesday", period=2, start_time="08:45", end_time="09:30", subject_name="Urdu", teacher_name="Ms. Fatima Shah", room="101"),
    TimetableEntry(school_id=school1.id, class_name="8", section="A", day="Wednesday", period=3, start_time="09:30", end_time="10:15", subject_name="English", teacher_name="Ms. Sara Ali", room="101"),
    TimetableEntry(school_id=school1.id, class_name="8", section="A", day="Thursday", period=1, start_time="08:00", end_time="08:45", subject_name="Science", teacher_name="Mr. Usman Raza", room="Lab 1"),
    TimetableEntry(school_id=school1.id, class_name="8", section="A", day="Thursday", period=2, start_time="08:45", end_time="09:30", subject_name="Mathematics", teacher_name="Mr. Ahmed Khan", room="101"),
    TimetableEntry(school_id=school1.id, class_name="8", section="A", day="Thursday", period=3, start_time="09:30", end_time="10:15", subject_name="Computer Science", teacher_name="Mr. Bilal Malik", room="Lab 2"),
    TimetableEntry(school_id=school1.id, class_name="8", section="A", day="Friday", period=1, start_time="08:00", end_time="08:45", subject_name="Islamiat", teacher_name="Ms. Ayesha Noor", room="101"),
    TimetableEntry(school_id=school1.id, class_name="8", section="A", day="Friday", period=2, start_time="08:45", end_time="09:30", subject_name="English", teacher_name="Ms. Sara Ali", room="101"),
    TimetableEntry(school_id=school1.id, class_name="8", section="A", day="Friday", period=3, start_time="09:30", end_time="10:15", subject_name="Mathematics", teacher_name="Mr. Ahmed Khan", room="101"),
]
db.add_all(timetable_entries)
db.commit()

db.close()
print("\n✅ Full seed complete!")
print("="*50)
print("Super Admin:  superadmin@nyxion.ai  / admin123")
print("TCS Admin:    admin@tcs.edu.pk      / admin123")
print("BHS Admin:    admin@bhs.edu.pk      / admin123")
print("Teacher:      teacher@tcs.edu.pk    / admin123")
print("="*50)
print("TCS has: 10 students, 6 teachers, 10 subjects")
print("         7 days attendance, fees Jan-Apr")
print("         3 assignments, 4 submissions")
print("         5 results per student, 6 coursebooks")
print("         18 timetable entries (Class 8A)")
print("         4 notices")
