from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.subject import Subject
from app.models.student import Student
from app.models.user import User
from app.api.v1.endpoints.auth import get_current_user
from pydantic import BaseModel
from typing import Optional
import uuid

router = APIRouter()

class SubjectCreate(BaseModel):
    name: str
    class_name: Optional[str] = None
    teacher_id: Optional[uuid.UUID] = None
    description: Optional[str] = None

@router.get("/subjects")
def list_subjects(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    subjects = db.query(Subject).filter(
        Subject.school_id == current_user.school_id,
        Subject.is_active == True
    ).all()
    return [{"id": str(s.id), "name": s.name, "class_name": s.class_name, "description": s.description} for s in subjects]

@router.post("/subjects")
def create_subject(data: SubjectCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    subject = Subject(**data.dict(), school_id=current_user.school_id)
    db.add(subject)
    db.commit()
    db.refresh(subject)
    return {"id": str(subject.id), "name": subject.name}

@router.get("/classes")
def list_classes(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    students = db.query(Student.class_name, Student.section).filter(
        Student.school_id == current_user.school_id,
        Student.is_active == True
    ).distinct().all()
    classes = {}
    for class_name, section in students:
        if class_name not in classes:
            classes[class_name] = []
        if section and section not in classes[class_name]:
            classes[class_name].append(section)
    return [{"class_name": k, "sections": v} for k, v in sorted(classes.items())]