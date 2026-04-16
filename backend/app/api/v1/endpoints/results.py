from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.result import Result
from app.models.student import Student
from app.models.user import User
from app.api.v1.endpoints.auth import get_current_user
from pydantic import BaseModel
from typing import Optional, List
import uuid

router = APIRouter()

class ResultCreate(BaseModel):
    student_id: uuid.UUID
    subject_name: str
    exam_type: str
    term: Optional[str] = None
    class_name: Optional[str] = None
    total_marks: float
    marks_obtained: float
    remarks: Optional[str] = None

def calculate_grade(marks_obtained, total_marks):
    pct = (marks_obtained / total_marks) * 100
    if pct >= 90: return 'A+'
    if pct >= 80: return 'A'
    if pct >= 70: return 'B'
    if pct >= 60: return 'C'
    if pct >= 50: return 'D'
    return 'F'

@router.get("/")
def list_results(class_name: Optional[str] = None, exam_type: Optional[str] = None,
                 db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    q = db.query(Result, Student).join(Student).filter(Result.school_id == current_user.school_id)
    if class_name: q = q.filter(Result.class_name == class_name)
    if exam_type: q = q.filter(Result.exam_type == exam_type)
    results = q.all()
    return [
        {
            "id": str(r.id),
            "student_name": s.full_name,
            "roll_number": s.roll_number,
            "subject_name": r.subject_name,
            "exam_type": r.exam_type,
            "term": r.term,
            "class_name": r.class_name,
            "total_marks": r.total_marks,
            "marks_obtained": r.marks_obtained,
            "percentage": round((r.marks_obtained/r.total_marks)*100, 1),
            "grade": r.grade,
            "remarks": r.remarks
        }
        for r, s in results
    ]

@router.post("/")
def add_result(data: ResultCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    grade = calculate_grade(data.marks_obtained, data.total_marks)
    result = Result(**data.dict(), school_id=current_user.school_id, grade=grade)
    db.add(result)
    db.commit()
    return {"message": "Result added", "grade": grade}

@router.get("/student/{student_id}")
def student_results(student_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    results = db.query(Result).filter(
        Result.student_id == student_id,
        Result.school_id == current_user.school_id
    ).all()
    return results

@router.get("/class-analysis")
def class_analysis(class_name: str, exam_type: str,
                   db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    results = db.query(Result).filter(
        Result.school_id == current_user.school_id,
        Result.class_name == class_name,
        Result.exam_type == exam_type
    ).all()
    if not results:
        return {"message": "No results found"}
    percentages = [(r.marks_obtained/r.total_marks)*100 for r in results]
    return {
        "class": class_name,
        "exam_type": exam_type,
        "total_students": len(results),
        "average": round(sum(percentages)/len(percentages), 1),
        "highest": round(max(percentages), 1),
        "lowest": round(min(percentages), 1),
        "pass_rate": round(sum(1 for p in percentages if p >= 50)/len(percentages)*100, 1),
        "grade_distribution": {
            "A+": sum(1 for p in percentages if p >= 90),
            "A":  sum(1 for p in percentages if 80 <= p < 90),
            "B":  sum(1 for p in percentages if 70 <= p < 80),
            "C":  sum(1 for p in percentages if 60 <= p < 70),
            "D":  sum(1 for p in percentages if 50 <= p < 60),
            "F":  sum(1 for p in percentages if p < 50),
        }
    }