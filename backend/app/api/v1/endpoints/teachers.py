from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.teacher import Teacher
from app.models.user import User
from app.api.v1.endpoints.auth import get_current_user
from pydantic import BaseModel
from typing import Optional, List
import uuid

router = APIRouter()

class TeacherCreate(BaseModel):
    full_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    subject: Optional[str] = None
    qualification: Optional[str] = None
    salary: Optional[str] = None

class TeacherOut(BaseModel):
    id: uuid.UUID
    school_id: uuid.UUID
    full_name: str
    email: Optional[str]
    phone: Optional[str]
    subject: Optional[str]
    qualification: Optional[str]
    salary: Optional[str]
    is_active: bool

    class Config:
        from_attributes = True

@router.get("/", response_model=List[TeacherOut])
def list_teachers(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Teacher).filter(
        Teacher.school_id == current_user.school_id,
        Teacher.is_active == True
    ).all()

@router.post("/", response_model=TeacherOut)
def create_teacher(data: TeacherCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    teacher = Teacher(**data.dict(), school_id=current_user.school_id)
    db.add(teacher)
    db.commit()
    db.refresh(teacher)
    return teacher

@router.delete("/{teacher_id}")
def delete_teacher(teacher_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    teacher = db.query(Teacher).filter(
        Teacher.id == teacher_id,
        Teacher.school_id == current_user.school_id
    ).first()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")
    teacher.is_active = False
    db.commit()
    return {"message": "Deleted"}
