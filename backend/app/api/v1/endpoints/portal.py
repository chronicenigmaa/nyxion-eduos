from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.user import User, UserRole
from app.models.student import Student
from app.models.teacher import Teacher
from app.models.assignment import Assignment
from app.models.submission import Submission, SubmissionStatus
from app.models.result import Result
from app.models.attendance import Attendance, AttendanceStatus
from app.models.fee import Fee, FeeStatus
from app.models.coursebook import CourseBook
from app.models.timetable import TimetableEntry
from app.models.notice import Notice
from app.models.school import School
from app.api.v1.endpoints.auth import get_current_user
from pydantic import BaseModel
from typing import Optional
import uuid
from datetime import datetime, date

router = APIRouter()

class SubmissionCreate(BaseModel):
    assignment_id: uuid.UUID
    content: str

@router.get("/dashboard")
def portal_dashboard(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Unified dashboard for students and teachers"""
    school_id = current_user.school_id

    if current_user.role.value == "super_admin":
        schools = db.query(School).filter(School.is_active == True).count()
        students = db.query(Student).filter(Student.is_active == True).count()
        teachers = db.query(Teacher).filter(Teacher.is_active == True).count()
        pending_fees = db.query(Fee).filter(Fee.status != FeeStatus.PAID).count()
        recent_notices = db.query(Notice).order_by(Notice.created_at.desc()).limit(3).all()

        return {
            "role": "super_admin",
            "name": current_user.full_name,
            "stats": {
                "attendance_rate": 100,
                "pending_assignments": schools,
                "pending_fees": pending_fees,
                "total_results": students + teachers,
            },
            "assignments": [
                {
                    "id": "schools",
                    "title": "Network Overview",
                    "subject": f"{schools} active schools",
                    "total_marks": schools,
                    "due_date": None,
                    "submitted": True,
                    "grade": None,
                    "feedback": None,
                    "status": "ready",
                },
                {
                    "id": "students",
                    "title": "Student Enrollment",
                    "subject": f"{students} active students",
                    "total_marks": students,
                    "due_date": None,
                    "submitted": True,
                    "grade": None,
                    "feedback": None,
                    "status": "ready",
                },
                {
                    "id": "teachers",
                    "title": "Teacher Coverage",
                    "subject": f"{teachers} active teachers",
                    "total_marks": teachers,
                    "due_date": None,
                    "submitted": True,
                    "grade": None,
                    "feedback": None,
                    "status": "ready",
                },
            ],
            "notices": [{"title": n.title, "type": n.type, "date": str(n.created_at)} for n in recent_notices],
        }

    if not school_id:
        raise HTTPException(status_code=400, detail="No school associated")

    if current_user.role.value == "school_admin":
        students = db.query(Student).filter(
            Student.school_id == school_id,
            Student.is_active == True,
        ).count()
        teachers = db.query(Teacher).filter(
            Teacher.school_id == school_id,
            Teacher.is_active == True,
        ).count()
        assignments = db.query(Assignment).filter(
            Assignment.school_id == school_id
        ).order_by(Assignment.created_at.desc()).limit(5).all()
        pending_fees = db.query(Fee).filter(
            Fee.school_id == school_id,
            Fee.status != FeeStatus.PAID,
        ).count()
        recent_notices = db.query(Notice).filter(
            Notice.school_id == school_id
        ).order_by(Notice.created_at.desc()).limit(3).all()

        return {
            "role": "school_admin",
            "name": current_user.full_name,
            "stats": {
                "attendance_rate": 100,
                "pending_assignments": len(assignments),
                "pending_fees": pending_fees,
                "total_results": students,
            },
            "assignments": [
                {
                    "id": str(a.id),
                    "title": a.title,
                    "subject": a.class_name or "School-wide",
                    "total_marks": a.total_marks,
                    "due_date": str(a.due_date) if a.due_date else None,
                    "submitted": True,
                    "grade": None,
                    "feedback": None,
                    "status": a.status,
                }
                for a in assignments
            ] + [
                {
                    "id": "teachers",
                    "title": "Teacher Coverage",
                    "subject": f"{teachers} active teachers",
                    "total_marks": teachers,
                    "due_date": None,
                    "submitted": True,
                    "grade": None,
                    "feedback": None,
                    "status": "ready",
                }
            ],
            "notices": [{"title": n.title, "type": n.type, "date": str(n.created_at)} for n in recent_notices],
        }

    if current_user.role.value == "teacher":
        from app.models.subject import Subject
        from app.models.class_section import ClassSection

        teacher = db.query(Teacher).filter(
            Teacher.school_id == school_id,
            Teacher.email == current_user.email,
            Teacher.is_active == True,
        ).first()

        teacher_id = teacher.id if teacher else None

        my_subjects = []
        my_sections = []
        if teacher_id:
            my_subjects = db.query(Subject).filter(
                Subject.school_id == school_id,
                Subject.teacher_id == teacher_id,
                Subject.is_active == True,
            ).order_by(Subject.class_name, Subject.name).all()

            my_sections = db.query(ClassSection).filter(
                ClassSection.school_id == school_id,
                ClassSection.class_teacher_id == teacher_id,
                ClassSection.is_active == True,
            ).order_by(ClassSection.class_name, ClassSection.section).all()

        # Count only students in this teacher's assigned classes
        pairs: set[tuple[str, str]] = set()
        for cs in my_sections:
            pairs.add((cs.class_name, cs.section))
        for s in my_subjects:
            if s.class_name:
                pairs.add((s.class_name, s.section or ""))

        if pairs:
            all_students = db.query(Student).filter(
                Student.school_id == school_id,
                Student.is_active == True,
            ).all()
            student_count = sum(
                1 for st in all_students
                for cn, sec in pairs
                if st.class_name == cn and (not sec or st.section == sec)
            )
            # deduplicate (student could match multiple pairs)
            matched_ids = set()
            for st in all_students:
                for cn, sec in pairs:
                    if st.class_name == cn and (not sec or st.section == sec):
                        matched_ids.add(st.id)
                        break
            student_count = len(matched_ids)
        else:
            student_count = 0

        assignments = db.query(Assignment).filter(
            Assignment.school_id == school_id,
        ).order_by(Assignment.created_at.desc()).limit(5).all()

        today = date.today()
        attendance_today = db.query(Attendance).filter(
            Attendance.school_id == school_id,
            Attendance.date == today,
        ).count()

        return {
            "role": "teacher",
            "name": current_user.full_name,
            "stats": {
                "total_students": student_count,
                "subjects_teaching": len(my_subjects),
                "class_teacher_of": len(my_sections),
                "attendance_marked_today": attendance_today,
            },
            "my_subjects": [
                {
                    "id": str(s.id),
                    "name": s.name,
                    "class_name": s.class_name,
                    "section": s.section,
                }
                for s in my_subjects
            ],
            "my_sections": [
                {
                    "id": str(sec.id),
                    "class_name": sec.class_name,
                    "section": sec.section,
                }
                for sec in my_sections
            ],
            "recent_assignments": [
                {
                    "id": str(a.id),
                    "title": a.title,
                    "class_name": a.class_name,
                    "due_date": str(a.due_date) if a.due_date else None,
                    "total_marks": a.total_marks,
                }
                for a in assignments
            ],
        }

    elif current_user.role.value == "student":
        # Find student record linked to this user by email
        student = db.query(Student).filter(
            Student.school_id == school_id,
            Student.email == current_user.email
        ).first()

        if not student:
            # Try matching by name
            student = db.query(Student).filter(
                Student.school_id == school_id
            ).first()

        if not student:
            return {"role": "student", "name": current_user.full_name, "stats": {}, "message": "Student record not linked yet"}

        # Get student's assignments
        assignments = db.query(Assignment).filter(
            Assignment.school_id == school_id,
            Assignment.class_name == student.class_name
        ).order_by(Assignment.due_date).all()

        # Get submissions
        submissions = db.query(Submission).filter(
            Submission.student_id == student.id
        ).all()
        submitted_ids = {str(s.assignment_id): s for s in submissions}

        # Get results
        results = db.query(Result).filter(
            Result.student_id == student.id
        ).order_by(Result.created_at.desc()).limit(10).all()

        # Attendance summary
        att_records = db.query(Attendance).filter(
            Attendance.student_id == student.id
        ).all()
        present = sum(1 for a in att_records if a.status == AttendanceStatus.PRESENT)
        att_rate = round((present / len(att_records)) * 100, 1) if att_records else 0

        # Fees
        fees = db.query(Fee).filter(
            Fee.student_id == student.id,
            Fee.status != FeeStatus.PAID
        ).count()

        # Notices
        notices = db.query(Notice).filter(
            Notice.school_id == school_id
        ).order_by(Notice.created_at.desc()).limit(3).all()

        return {
            "role": "student",
            "name": current_user.full_name,
            "student_id": str(student.id),
            "class_name": student.class_name,
            "roll_number": student.roll_number,
            "stats": {
                "attendance_rate": att_rate,
                "pending_assignments": sum(1 for a in assignments if str(a.id) not in submitted_ids),
                "pending_fees": fees,
                "total_results": len(results)
            },
            "assignments": [
                {
                    "id": str(a.id), "title": a.title, "subject": a.description[:50] if a.description else "",
                    "total_marks": a.total_marks,
                    "due_date": str(a.due_date) if a.due_date else None,
                    "submitted": str(a.id) in submitted_ids,
                    "grade": submitted_ids[str(a.id)].marks_obtained if str(a.id) in submitted_ids else None,
                    "feedback": submitted_ids[str(a.id)].feedback if str(a.id) in submitted_ids else None,
                    "status": submitted_ids[str(a.id)].status if str(a.id) in submitted_ids else "pending"
                }
                for a in assignments
            ],
            "recent_results": [
                {"subject": r.subject_name, "exam_type": r.exam_type, "marks": r.marks_obtained,
                 "total": r.total_marks, "grade": r.grade, "term": r.term}
                for r in results
            ],
            "notices": [{"title": n.title, "type": n.type, "date": str(n.created_at)} for n in notices]
        }

    raise HTTPException(status_code=403, detail="Invalid role for portal")

@router.get("/my-students")
def my_students(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from app.models.subject import Subject
    from app.models.class_section import ClassSection

    school_id = current_user.school_id
    if not school_id:
        raise HTTPException(status_code=400, detail="No school associated")

    teacher = db.query(Teacher).filter(
        Teacher.school_id == school_id,
        Teacher.email == current_user.email,
        Teacher.is_active == True,
    ).first()

    if not teacher:
        return {"students": [], "classes": []}

    # Classes where teacher is class teacher
    class_sections = db.query(ClassSection).filter(
        ClassSection.school_id == school_id,
        ClassSection.class_teacher_id == teacher.id,
        ClassSection.is_active == True,
    ).all()

    # Classes where teacher teaches a subject
    taught = db.query(Subject).filter(
        Subject.school_id == school_id,
        Subject.teacher_id == teacher.id,
        Subject.is_active == True,
    ).all()

    # Collect unique (class_name, section) pairs
    pairs: set[tuple[str, str]] = set()
    for cs in class_sections:
        pairs.add((cs.class_name, cs.section))
    for s in taught:
        if s.class_name:
            pairs.add((s.class_name, s.section or ""))

    if not pairs:
        return {"students": [], "classes": []}

    students = db.query(Student).filter(
        Student.school_id == school_id,
        Student.is_active == True,
    ).all()

    result = []
    for student in students:
        for class_name, section in pairs:
            if student.class_name == class_name and (not section or student.section == section):
                result.append({
                    "id": str(student.id),
                    "full_name": student.full_name,
                    "father_name": student.father_name,
                    "roll_number": student.roll_number,
                    "class_name": student.class_name,
                    "section": student.section,
                    "phone": student.phone,
                })
                break

    result.sort(key=lambda x: (x["class_name"] or "", x["section"] or "", x["full_name"]))
    classes = sorted({f"{s['class_name']}{s['section']}" for s in result if s["class_name"]})
    return {"students": result, "classes": classes}


@router.get("/attendance")
def portal_attendance(attendance_date: str = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from app.models.subject import Subject
    from app.models.class_section import ClassSection

    school_id = current_user.school_id
    if not school_id:
        raise HTTPException(status_code=400, detail="No school associated")

    teacher = db.query(Teacher).filter(
        Teacher.school_id == school_id,
        Teacher.email == current_user.email,
        Teacher.is_active == True,
    ).first()
    if not teacher:
        return {"students": [], "classes": []}

    class_sections = db.query(ClassSection).filter(
        ClassSection.school_id == school_id,
        ClassSection.class_teacher_id == teacher.id,
        ClassSection.is_active == True,
    ).all()
    taught = db.query(Subject).filter(
        Subject.school_id == school_id,
        Subject.teacher_id == teacher.id,
        Subject.is_active == True,
    ).all()

    pairs: set[tuple[str, str]] = set()
    for cs in class_sections:
        pairs.add((cs.class_name, cs.section))
    for s in taught:
        if s.class_name:
            pairs.add((s.class_name, s.section or ""))

    if not pairs:
        return {"students": [], "classes": []}

    all_students = db.query(Student).filter(
        Student.school_id == school_id,
        Student.is_active == True,
    ).all()

    matched_ids: set = set()
    student_map = {}
    for st in all_students:
        for cn, sec in pairs:
            if st.class_name == cn and (not sec or st.section == sec):
                matched_ids.add(st.id)
                student_map[st.id] = st
                break

    target_date = date.fromisoformat(attendance_date) if attendance_date else date.today()

    att_records = db.query(Attendance).filter(
        Attendance.school_id == school_id,
        Attendance.date == target_date,
        Attendance.student_id.in_(matched_ids),
    ).all()
    att_map = {str(r.student_id): r.status for r in att_records}

    result = []
    for st in sorted(student_map.values(), key=lambda x: (x.class_name or "", x.section or "", x.full_name)):
        result.append({
            "id": str(st.id),
            "full_name": st.full_name,
            "roll_number": st.roll_number,
            "class_name": st.class_name,
            "section": st.section,
            "status": att_map.get(str(st.id), "not_marked"),
        })

    classes = sorted({f"{s['class_name']}{s['section'] or ''}" for s in result if s["class_name"]})
    return {"students": result, "classes": classes, "date": str(target_date)}


@router.post("/submit-assignment")
def submit_assignment(data: SubmissionCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    school_id = current_user.school_id
    student = db.query(Student).filter(Student.school_id == school_id, Student.email == current_user.email).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student record not found")
    existing = db.query(Submission).filter(
        Submission.assignment_id == data.assignment_id,
        Submission.student_id == student.id
    ).first()
    if existing:
        existing.content = data.content
        existing.submitted_at = datetime.utcnow()
        db.commit()
        return {"message": "Resubmitted successfully"}
    submission = Submission(
        school_id=school_id,
        assignment_id=data.assignment_id,
        student_id=student.id,
        content=data.content,
        status=SubmissionStatus.SUBMITTED
    )
    db.add(submission)
    db.commit()
    return {"message": "Submitted successfully"}

@router.get("/my-results")
def my_results(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    school_id = current_user.school_id
    student = db.query(Student).filter(Student.school_id == school_id, Student.email == current_user.email).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    results = db.query(Result).filter(Result.student_id == student.id).all()
    return results

@router.get("/my-timetable")
def my_timetable(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    school_id = current_user.school_id
    student = db.query(Student).filter(Student.school_id == school_id, Student.email == current_user.email).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    entries = db.query(TimetableEntry).filter(
        TimetableEntry.school_id == school_id,
        TimetableEntry.class_name == student.class_name
    ).order_by(TimetableEntry.day, TimetableEntry.period).all()
    days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
    result = {day: [] for day in days}
    for e in entries:
        if e.day in result:
            result[e.day].append({"period": e.period, "subject": e.subject_name,
                "teacher": e.teacher_name, "time": f"{e.start_time}-{e.end_time}", "room": e.room})
    return result

@router.get("/coursebooks")
def portal_coursebooks(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    school_id = current_user.school_id
    student = db.query(Student).filter(Student.school_id == school_id, Student.email == current_user.email).first()
    class_name = student.class_name if student else None
    q = db.query(CourseBook).filter(CourseBook.school_id == school_id, CourseBook.is_active == True)
    if class_name:
        q = q.filter(CourseBook.class_name == class_name)
    books = q.all()
    return [{"id": str(b.id), "title": b.title, "description": b.description,
             "file_url": b.file_url, "file_type": b.file_type, "class_name": b.class_name} for b in books]
