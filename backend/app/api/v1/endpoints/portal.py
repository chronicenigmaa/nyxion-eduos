from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.user import User, UserRole
from app.models.student import Student
from app.models.assignment import Assignment
from app.models.submission import Submission, SubmissionStatus
from app.models.result import Result
from app.models.attendance import Attendance, AttendanceStatus
from app.models.fee import Fee, FeeStatus
from app.models.coursebook import CourseBook
from app.models.timetable import TimetableEntry
from app.models.notice import Notice
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
    if not school_id:
        raise HTTPException(status_code=400, detail="No school associated")

    if current_user.role.value == "teacher":
        # Teacher dashboard
        assignments = db.query(Assignment).filter(
            Assignment.school_id == school_id
        ).order_by(Assignment.created_at.desc()).limit(5).all()

        students = db.query(Student).filter(
            Student.school_id == school_id, Student.is_active == True
        ).count()

        today = date.today()
        from app.models.attendance import Attendance
        attendance_today = db.query(Attendance).filter(
            Attendance.school_id == school_id,
            Attendance.date == today
        ).count()

        return {
            "role": "teacher",
            "name": current_user.full_name,
            "stats": {
                "total_students": students,
                "assignments_created": len(assignments),
                "attendance_marked_today": attendance_today
            },
            "recent_assignments": [
                {"id": str(a.id), "title": a.title, "class_name": a.class_name,
                 "due_date": str(a.due_date) if a.due_date else None, "total_marks": a.total_marks}
                for a in assignments
            ]
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