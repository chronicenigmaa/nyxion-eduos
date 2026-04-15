from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.student import Student
from app.models.user import User
from app.schemas.student import StudentCreate, StudentOut
from app.api.v1.endpoints.auth import get_current_user
from typing import List
import uuid

router = APIRouter()

@router.get("/", response_model=List[StudentOut])
def list_students(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not current_user.school_id:
        raise HTTPException(status_code=400, detail="No school associated")
    return db.query(Student).filter(
        Student.school_id == current_user.school_id,
        Student.is_active == True
    ).all()

@router.post("/", response_model=StudentOut)
def create_student(data: StudentCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not current_user.school_id:
        raise HTTPException(status_code=400, detail="No school associated")
    student = Student(**data.dict(), school_id=current_user.school_id)
    db.add(student)
    db.commit()
    db.refresh(student)
    return student

@router.delete("/{student_id}")
def delete_student(student_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    student = db.query(Student).filter(
        Student.id == student_id,
        Student.school_id == current_user.school_id
    ).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    student.is_active = False
    db.commit()
    return {"message": "Deleted"}