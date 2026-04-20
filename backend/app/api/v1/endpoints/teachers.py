from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.teacher import Teacher
from app.models.user import User, UserRole
from app.core.security import get_password_hash
from app.api.v1.endpoints.auth import get_current_user
from pydantic import BaseModel, EmailStr
from typing import Optional, List
import uuid
import secrets

router = APIRouter()


class TeacherCreate(BaseModel):
    full_name: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    subject: Optional[str] = None
    qualification: Optional[str] = None
    salary: Optional[str] = None
    temporary_password: Optional[str] = None


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
    if current_user.role.value == "super_admin":
        return db.query(Teacher).filter(Teacher.is_active == True).all()
    return db.query(Teacher).filter(
        Teacher.school_id == current_user.school_id,
        Teacher.is_active == True
    ).all()


@router.post("/")
def create_teacher(data: TeacherCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not current_user.school_id:
        raise HTTPException(status_code=400, detail="No school associated")

    teacher = Teacher(
        full_name=data.full_name,
        email=data.email,
        phone=data.phone,
        subject=data.subject,
        qualification=data.qualification,
        salary=data.salary,
        school_id=current_user.school_id,
    )

    login_created = False
    temporary_password: Optional[str] = None

    if data.email:
        existing_user = db.query(User).filter(User.email == data.email).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="A user with this email already exists")

        temporary_password = data.temporary_password or secrets.token_urlsafe(8)
        teacher_user = User(
            school_id=current_user.school_id,
            email=data.email,
            full_name=data.full_name,
            hashed_password=get_password_hash(temporary_password),
            role=UserRole.TEACHER,
            must_change_password=True,
            is_active=True,
        )
        db.add(teacher_user)
        login_created = True

    db.add(teacher)
    db.commit()
    db.refresh(teacher)

    return {
        "teacher": TeacherOut.model_validate(teacher).model_dump(),
        "login_created": login_created,
        "temporary_password": temporary_password,
    }


@router.post("/{teacher_id}/credentials")
def regenerate_teacher_credentials(
    teacher_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Teacher).filter(Teacher.id == teacher_id, Teacher.is_active == True)
    if current_user.role != UserRole.SUPER_ADMIN:
        if not current_user.school_id:
            raise HTTPException(status_code=400, detail="No school associated")
        query = query.filter(Teacher.school_id == current_user.school_id)

    teacher = query.first()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")
    if not teacher.email:
        raise HTTPException(status_code=400, detail="Teacher has no email; cannot generate credentials")

    temporary_password = secrets.token_urlsafe(8)
    user = db.query(User).filter(User.email == teacher.email).first()
    if not user:
        user = User(
            school_id=teacher.school_id,
            email=teacher.email,
            full_name=teacher.full_name,
            hashed_password=get_password_hash(temporary_password),
            role=UserRole.TEACHER,
            must_change_password=True,
            is_active=True,
        )
        db.add(user)
    else:
        user.full_name = teacher.full_name
        user.school_id = teacher.school_id
        user.role = UserRole.TEACHER
        user.hashed_password = get_password_hash(temporary_password)
        user.must_change_password = True
        user.is_active = True

    db.commit()
    return {
        "message": "Teacher credentials generated",
        "email": teacher.email,
        "temporary_password": temporary_password,
        "must_change_password": True,
    }


@router.delete("/{teacher_id}")
def delete_teacher(teacher_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    query = db.query(Teacher).filter(Teacher.id == teacher_id)
    if current_user.role != UserRole.SUPER_ADMIN:
        if not current_user.school_id:
            raise HTTPException(status_code=400, detail="No school associated")
        query = query.filter(Teacher.school_id == current_user.school_id)
    teacher = query.first()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")
    teacher.is_active = False
    db.commit()
    return {"message": "Deleted"}
