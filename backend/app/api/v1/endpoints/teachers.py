from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.teacher import Teacher
from app.models.school import School
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
    school_id: Optional[uuid.UUID] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    subject: Optional[str] = None
    qualification: Optional[str] = None
    salary: Optional[str] = None
    password: Optional[str] = None
    temporary_password: Optional[str] = None


class TeacherUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    subject: Optional[str] = None
    qualification: Optional[str] = None
    salary: Optional[str] = None
    password: Optional[str] = None
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


def _normalized_text(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    normalized = value.strip()
    return normalized or None


def _normalized_email(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    normalized = value.strip().lower()
    return normalized or None


def _validate_teacher_email(
    db: Session,
    *,
    email: Optional[str],
    school_id: uuid.UUID,
    teacher_id: Optional[uuid.UUID] = None,
    linked_user_id: Optional[uuid.UUID] = None,
):
    if not email:
        return

    duplicate_teacher = db.query(Teacher).filter(
        Teacher.email == email,
        Teacher.is_active == True,
    )
    if teacher_id:
        duplicate_teacher = duplicate_teacher.filter(Teacher.id != teacher_id)
    if duplicate_teacher.first():
        raise HTTPException(status_code=400, detail="A teacher with this email already exists")

    duplicate_user = db.query(User).filter(User.email == email)
    if linked_user_id:
        duplicate_user = duplicate_user.filter(User.id != linked_user_id)
    duplicate_user = duplicate_user.first()
    if duplicate_user:
        if duplicate_user.role != UserRole.TEACHER:
            raise HTTPException(status_code=400, detail="This email is already linked to a non-teacher user")
        if duplicate_user.school_id and duplicate_user.school_id != school_id:
            raise HTTPException(status_code=400, detail="This email is already linked to another school")


def _sync_teacher_user(
    db: Session,
    teacher: Teacher,
    *,
    password: Optional[str] = None,
    linked_user: Optional[User] = None,
):
    if not teacher.email:
        return None

    user = linked_user or db.query(User).filter(User.email == teacher.email).first()
    if user and user.role != UserRole.TEACHER:
        raise HTTPException(status_code=400, detail="This email is already linked to a non-teacher user")

    if not user:
        generated_password = password or secrets.token_urlsafe(8)
        user = User(
            school_id=teacher.school_id,
            email=teacher.email,
            full_name=teacher.full_name,
            hashed_password=get_password_hash(generated_password),
            role=UserRole.TEACHER,
            must_change_password=True,
            is_active=True,
        )
        db.add(user)
        return generated_password

    user.school_id = teacher.school_id
    user.email = teacher.email
    user.full_name = teacher.full_name
    user.role = UserRole.TEACHER
    user.is_active = True
    if password:
        user.hashed_password = get_password_hash(password)
        user.must_change_password = True
    return password


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
    if current_user.role == UserRole.SUPER_ADMIN:
        target_school_id = data.school_id or current_user.school_id
        if not target_school_id:
            raise HTTPException(status_code=400, detail="Select a school before creating a teacher")
    else:
        if not current_user.school_id:
            raise HTTPException(status_code=400, detail="No school associated")
        target_school_id = current_user.school_id

    school = db.query(School).filter(School.id == target_school_id, School.is_active == True).first()
    if not school:
        raise HTTPException(status_code=404, detail="Selected school not found or inactive")

    normalized_name = _normalized_text(data.full_name) or data.full_name
    normalized_email = _normalized_email(data.email)

    _validate_teacher_email(db, email=normalized_email, school_id=target_school_id)

    teacher = Teacher(
        full_name=normalized_name,
        email=normalized_email,
        phone=_normalized_text(data.phone),
        subject=_normalized_text(data.subject),
        qualification=_normalized_text(data.qualification),
        salary=_normalized_text(data.salary),
        school_id=target_school_id,
    )

    login_created = False
    temporary_password: Optional[str] = None

    if normalized_email:
        temporary_password = data.password or data.temporary_password or secrets.token_urlsafe(8)
        teacher_user = User(
            school_id=target_school_id,
            email=normalized_email,
            full_name=normalized_name,
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


@router.put("/{teacher_id}")
@router.patch("/{teacher_id}")
def update_teacher(
    teacher_id: uuid.UUID,
    data: TeacherUpdate,
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

    linked_user = None
    if teacher.email:
        linked_user = db.query(User).filter(User.email == teacher.email).first()

    normalized_name = _normalized_text(data.full_name) if data.full_name is not None else teacher.full_name
    normalized_email = _normalized_email(data.email) if data.email is not None else teacher.email

    _validate_teacher_email(
        db,
        email=normalized_email,
        school_id=teacher.school_id,
        teacher_id=teacher.id,
        linked_user_id=linked_user.id if linked_user else None,
    )

    teacher.full_name = normalized_name or teacher.full_name
    teacher.email = normalized_email
    if data.phone is not None:
        teacher.phone = _normalized_text(data.phone)
    if data.subject is not None:
        teacher.subject = _normalized_text(data.subject)
    if data.qualification is not None:
        teacher.qualification = _normalized_text(data.qualification)
    if data.salary is not None:
        teacher.salary = _normalized_text(data.salary)

    password = data.password or data.temporary_password
    generated_password = _sync_teacher_user(db, teacher, password=password, linked_user=linked_user)

    db.commit()
    db.refresh(teacher)

    return {
        "teacher": TeacherOut.model_validate(teacher).model_dump(),
        "temporary_password": generated_password if password else None,
        "message": "Teacher updated",
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
