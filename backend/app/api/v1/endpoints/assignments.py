from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.assignment import Assignment, AssignmentStatus
from app.models.submission import Submission, SubmissionStatus
from app.models.student import Student
from app.models.user import User
from app.api.v1.endpoints.auth import get_current_user
from pydantic import BaseModel
from typing import Optional, List
import uuid
from datetime import datetime

router = APIRouter()

class AssignmentCreate(BaseModel):
    title: str
    description: Optional[str] = None
    class_name: Optional[str] = None
    section: Optional[str] = None
    total_marks: float = 100
    due_date: Optional[datetime] = None
    allow_late: bool = False

class SubmissionCreate(BaseModel):
    assignment_id: uuid.UUID
    student_id: uuid.UUID
    content: Optional[str] = None

class GradeSubmission(BaseModel):
    marks_obtained: float
    feedback: Optional[str] = None

@router.get("/")
def list_assignments(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Assignment).filter(
        Assignment.school_id == current_user.school_id
    ).order_by(Assignment.created_at.desc()).all()

@router.post("/")
def create_assignment(data: AssignmentCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    assignment = Assignment(**data.dict(), school_id=current_user.school_id)
    db.add(assignment)
    db.commit()
    db.refresh(assignment)
    return {"id": str(assignment.id), "title": assignment.title, "message": "Assignment created"}

@router.get("/{assignment_id}/submissions")
def get_submissions(assignment_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    assignment = db.query(Assignment).filter(
        Assignment.id == assignment_id,
        Assignment.school_id == current_user.school_id
    ).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    submissions = db.query(Submission, Student).join(Student).filter(
        Submission.assignment_id == assignment_id
    ).all()

    # Get all students in the class
    students = db.query(Student).filter(
        Student.school_id == current_user.school_id,
        Student.class_name == assignment.class_name,
        Student.is_active == True
    ).all()

    submitted_ids = {str(s.student_id) for s, _ in submissions}

    return {
        "assignment": {
            "id": str(assignment.id),
            "title": assignment.title,
            "total_marks": assignment.total_marks,
            "due_date": str(assignment.due_date) if assignment.due_date else None,
            "class_name": assignment.class_name,
        },
        "submitted": len(submissions),
        "total_students": len(students),
        "missing": len(students) - len(submissions),
        "submissions": [
            {
                "id": str(sub.id),
                "student_id": str(sub.student_id),
                "student_name": st.full_name,
                "roll_number": st.roll_number,
                "content": sub.content,
                "marks_obtained": sub.marks_obtained,
                "feedback": sub.feedback,
                "status": sub.status,
                "submitted_at": str(sub.submitted_at)
            }
            for sub, st in submissions
        ]
    }

@router.patch("/submissions/{submission_id}/grade")
def grade_submission(submission_id: uuid.UUID, data: GradeSubmission, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    sub = db.query(Submission).filter(Submission.id == submission_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")
    sub.marks_obtained = data.marks_obtained
    sub.feedback = data.feedback
    sub.status = SubmissionStatus.GRADED
    sub.graded_at = datetime.utcnow()
    db.commit()
    return {"message": "Graded"}

@router.post("/submit")
def submit_assignment(data: SubmissionCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    existing = db.query(Submission).filter(
        Submission.assignment_id == data.assignment_id,
        Submission.student_id == data.student_id
    ).first()
    if existing:
        existing.content = data.content
        existing.submitted_at = datetime.utcnow()
        db.commit()
        return {"message": "Resubmitted"}
    sub = Submission(
        school_id=current_user.school_id,
        assignment_id=data.assignment_id,
        student_id=data.student_id,
        content=data.content,
        status=SubmissionStatus.SUBMITTED
    )
    db.add(sub)
    db.commit()
    return {"message": "Submitted"}

@router.delete("/{assignment_id}")
def delete_assignment(assignment_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    assignment = db.query(Assignment).filter(
        Assignment.id == assignment_id,
        Assignment.school_id == current_user.school_id
    ).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(assignment)
    db.commit()
    return {"message": "Deleted"}