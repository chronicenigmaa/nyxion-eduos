from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session, selectinload
from app.core.database import get_db
from app.core.security import get_password_hash
from app.models.student import Student
from app.models.student_parent import StudentParent
from app.models.school import School
from app.models.user import User, UserRole
from app.schemas.student import StudentCreate, StudentOut
from app.api.v1.endpoints.auth import get_current_user
from typing import List
from pydantic import BaseModel, EmailStr
import logging
import uuid

router = APIRouter()
logger = logging.getLogger("nyxion.students")
DEFAULT_STUDENT_PASSWORD = "student123"


class StudentUpdate(BaseModel):
    full_name: str
    father_name: str | None = None
    roll_number: str | None = None
    class_name: str | None = None
    section: str | None = None
    phone: str | None = None
    address: str | None = None
    email: EmailStr | None = None
    password: str | None = None
    # Full replacement of the linked parent accounts. Omit to leave them as-is.
    parent_user_ids: list[uuid.UUID] | None = None


class ParentOption(BaseModel):
    id: uuid.UUID
    full_name: str
    email: str
    children_count: int


def _normalized_roll(roll_number: str | None) -> str | None:
    if roll_number is None:
        return None
    normalized = roll_number.strip()
    return normalized or None


def _normalized_text(value: str | None) -> str | None:
    if value is None:
        return None
    normalized = value.strip()
    return normalized or None


def _normalized_email(value: str | None) -> str | None:
    if value is None:
        return None
    normalized = value.strip().lower()
    return normalized or None


def _sqlalchemy_error_detail(exc: SQLAlchemyError) -> str:
    raw = str(getattr(exc, "orig", exc))
    return raw.strip() or "Database operation failed"


def _validate_student_email(db: Session, *, email: str | None, school_id, student_id: uuid.UUID | None = None, linked_user_id: uuid.UUID | None = None):
    if not email:
        return

    duplicate_student_query = db.query(Student).filter(
        func.lower(Student.email) == email,
        Student.is_active == True,
    )
    if student_id:
        duplicate_student_query = duplicate_student_query.filter(Student.id != student_id)
    if duplicate_student_query.first():
        raise HTTPException(status_code=400, detail="This email is already assigned to another student")

    duplicate_user_query = db.query(User).filter(func.lower(User.email) == email)
    if linked_user_id:
        duplicate_user_query = duplicate_user_query.filter(User.id != linked_user_id)
    duplicate_user = duplicate_user_query.first()
    if duplicate_user:
        if duplicate_user.role != UserRole.STUDENT:
            raise HTTPException(status_code=400, detail="This email is already linked to a non-student user")
        if school_id and duplicate_user.school_id and duplicate_user.school_id != school_id:
            raise HTTPException(status_code=400, detail="This email is already linked to another school")


def _set_student_parents(db: Session, student: Student, parent_user_ids: list[uuid.UUID] | None, school_id):
    """Replace a student's linked parent accounts. None leaves them untouched."""
    if parent_user_ids is None:
        return

    unique_ids = list(dict.fromkeys(parent_user_ids))
    parents: list[User] = []
    for parent_user_id in unique_ids:
        parent = db.query(User).filter(User.id == parent_user_id).first()
        if not parent or not parent.is_active:
            raise HTTPException(status_code=404, detail="Parent account not found")
        if parent.role != UserRole.PARENT:
            raise HTTPException(status_code=400, detail=f"{parent.email} is not a parent account")
        if parent.school_id and school_id and parent.school_id != school_id:
            raise HTTPException(status_code=400, detail=f"{parent.email} belongs to another school")
        parents.append(parent)

    student.parents = parents


@router.get("/parents", response_model=List[ParentOption])
def list_parent_options(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Parent accounts that can be linked to a student, for the admin picker."""
    query = db.query(User).filter(
        User.role == UserRole.PARENT,
        User.is_active == True,
    )
    if current_user.role != UserRole.SUPER_ADMIN:
        if not current_user.school_id:
            raise HTTPException(status_code=400, detail="No school associated")
        query = query.filter(User.school_id == current_user.school_id)

    parents = query.order_by(User.full_name).all()
    if not parents:
        return []

    counts = dict(
        db.query(StudentParent.parent_user_id, func.count(StudentParent.student_id))
        .join(Student, Student.id == StudentParent.student_id)
        .filter(
            StudentParent.parent_user_id.in_([p.id for p in parents]),
            Student.is_active == True,
        )
        .group_by(StudentParent.parent_user_id)
        .all()
    )
    return [
        ParentOption(
            id=parent.id,
            full_name=parent.full_name,
            email=parent.email,
            children_count=counts.get(parent.id, 0),
        )
        for parent in parents
    ]


@router.get("/parent-links")
def parent_links(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Every parent → children link, for LearnSpace to mirror into parent_children.

    Children carry `roll_number` because that is the only identifier the two
    products share — a student is a row in `eduos.students` here and a row in
    `learnspace.users` there, so ids cannot be matched across schemas.
    """
    if current_user.role not in (UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN):
        raise HTTPException(status_code=403, detail="You are not allowed to read parent links")

    query = db.query(User).filter(User.role == UserRole.PARENT, User.is_active == True)
    if current_user.role != UserRole.SUPER_ADMIN:
        if not current_user.school_id:
            raise HTTPException(status_code=400, detail="No school associated")
        query = query.filter(User.school_id == current_user.school_id)

    return {
        "parents": [
            {
                "id": str(parent.id),
                "full_name": parent.full_name,
                "email": parent.email,
                "school_id": str(parent.school_id) if parent.school_id else None,
                "children": [
                    {
                        "id": str(child.id),
                        "full_name": child.full_name,
                        "roll_number": child.roll_number,
                        "class_name": child.class_name,
                        "section": child.section,
                    }
                    for child in parent.children
                    if child.is_active
                ],
            }
            for parent in query.order_by(User.full_name).all()
        ]
    }


def _sync_student_user(db: Session, student: Student, *, password: str | None = None, linked_user: User | None = None):
    if not student.email:
        return

    user = linked_user or db.query(User).filter(func.lower(User.email) == student.email.lower()).first()
    if user and user.role != UserRole.STUDENT:
        raise HTTPException(status_code=400, detail="This email is already linked to a non-student user")

    if not user:
        user = User(
            email=student.email,
            full_name=student.full_name,
            hashed_password=get_password_hash(password or DEFAULT_STUDENT_PASSWORD),
            role=UserRole.STUDENT,
            school_id=student.school_id,
            is_active=True,
            must_change_password=False,
        )
        db.add(user)
        return

    user.email = student.email
    user.full_name = student.full_name
    user.role = UserRole.STUDENT
    user.school_id = student.school_id
    user.is_active = True
    if password:
        user.hashed_password = get_password_hash(password)
        user.must_change_password = False


@router.get("/", response_model=List[StudentOut])
def list_students(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        # Eager-load parents: StudentOut renders them, and a lazy load would be
        # one extra query per student.
        query = db.query(Student).options(selectinload(Student.parents))
        if current_user.role.value == "super_admin":
            return query.filter(Student.is_active == True).all()
        if not current_user.school_id:
            raise HTTPException(status_code=400, detail="No school associated")
        return query.filter(
            Student.school_id == current_user.school_id,
            Student.is_active == True
        ).all()
    except HTTPException:
        raise
    except SQLAlchemyError as exc:
        logger.exception("DB error while listing students")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Unable to load students: {_sqlalchemy_error_detail(exc)}")
    except Exception:
        logger.exception("Unexpected error while listing students")
        db.rollback()
        raise HTTPException(status_code=500, detail="Unable to load students right now")


@router.post("/", response_model=StudentOut)
def create_student(data: StudentCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        if current_user.role.value == "super_admin":
            target_school_id = data.school_id or current_user.school_id
        else:
            target_school_id = current_user.school_id

        if not target_school_id:
            raise HTTPException(status_code=400, detail="Select a school before creating a student")

        school = db.query(School).filter(School.id == target_school_id, School.is_active == True).first()
        if not school:
            raise HTTPException(status_code=404, detail="Selected school not found or inactive")

        normalized_roll = _normalized_roll(data.roll_number)
        normalized_name = _normalized_text(data.full_name)
        normalized_father_name = _normalized_text(data.father_name)
        normalized_class_name = _normalized_text(data.class_name)
        normalized_section = _normalized_text(data.section)
        normalized_email = _normalized_email(data.email)

        duplicate_student = db.query(Student).filter(
            Student.school_id == target_school_id,
            Student.is_active == True,
            func.lower(Student.full_name) == (normalized_name or "").lower(),
            func.coalesce(func.lower(Student.father_name), "") == (normalized_father_name or "").lower(),
            func.coalesce(Student.class_name, "") == (normalized_class_name or ""),
            func.coalesce(Student.section, "") == (normalized_section or ""),
        ).first()
        if duplicate_student:
            raise HTTPException(
                status_code=400,
                detail="This student already exists in the selected class and section",
            )

        if normalized_roll:
            duplicate = db.query(Student).filter(
                Student.school_id == target_school_id,
                Student.roll_number == normalized_roll,
                Student.is_active == True,
            ).first()
            if duplicate:
                raise HTTPException(status_code=400, detail="This roll number is already assigned in your school")

        _validate_student_email(db, email=normalized_email, school_id=target_school_id)

        student = Student(
            school_id=target_school_id,
            full_name=normalized_name or data.full_name,
            father_name=normalized_father_name,
            class_name=normalized_class_name,
            section=normalized_section,
            roll_number=normalized_roll,
            date_of_birth=data.date_of_birth,
            phone=data.phone,
            address=data.address,
            email=normalized_email,
        )
        db.add(student)
        db.flush()
        _set_student_parents(db, student, data.parent_user_ids, target_school_id)
        _sync_student_user(db, student, password=data.password)
        db.commit()
        db.refresh(student)
        return student
    except HTTPException:
        raise
    except IntegrityError as exc:
        logger.exception("Constraint error while creating student")
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Student data violates database constraints: {_sqlalchemy_error_detail(exc)}")
    except SQLAlchemyError as exc:
        logger.exception("DB error while creating student")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Unable to save student: {_sqlalchemy_error_detail(exc)}")
    except Exception:
        logger.exception("Unexpected error while creating student")
        db.rollback()
        raise HTTPException(status_code=500, detail="Unable to save student right now")


@router.put("/{student_id}", response_model=StudentOut)
def update_student(student_id: uuid.UUID, data: StudentUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        if not current_user.school_id and current_user.role.value != "super_admin":
            raise HTTPException(status_code=400, detail="No school associated")

        query = db.query(Student).filter(Student.id == student_id, Student.is_active == True)
        if current_user.role.value != "super_admin":
            query = query.filter(Student.school_id == current_user.school_id)

        student = query.first()
        if not student:
            raise HTTPException(status_code=404, detail="Student not found")

        normalized_roll = _normalized_roll(data.roll_number)
        normalized_name = _normalized_text(data.full_name)
        normalized_father_name = _normalized_text(data.father_name)
        normalized_class_name = _normalized_text(data.class_name)
        normalized_section = _normalized_text(data.section)
        normalized_email = _normalized_email(data.email)

        duplicate_student = db.query(Student).filter(
            Student.school_id == student.school_id,
            Student.is_active == True,
            Student.id != student.id,
            func.lower(Student.full_name) == (normalized_name or "").lower(),
            func.coalesce(func.lower(Student.father_name), "") == (normalized_father_name or "").lower(),
            func.coalesce(Student.class_name, "") == (normalized_class_name or ""),
            func.coalesce(Student.section, "") == (normalized_section or ""),
        ).first()
        if duplicate_student:
            raise HTTPException(
                status_code=400,
                detail="This student already exists in the selected class and section",
            )

        if normalized_roll:
            duplicate = db.query(Student).filter(
                Student.school_id == student.school_id,
                Student.roll_number == normalized_roll,
                Student.is_active == True,
                Student.id != student.id,
            ).first()
            if duplicate:
                raise HTTPException(status_code=400, detail="This roll number is already assigned in your school")

        linked_user = None
        if student.email:
            linked_user = db.query(User).filter(func.lower(User.email) == student.email.lower()).first()

        _validate_student_email(
            db,
            email=normalized_email,
            school_id=student.school_id,
            student_id=student.id,
            linked_user_id=linked_user.id if linked_user else None,
        )

        student.full_name = normalized_name or data.full_name
        student.father_name = normalized_father_name
        student.roll_number = normalized_roll
        student.class_name = normalized_class_name
        student.section = normalized_section
        student.phone = data.phone
        student.address = data.address
        student.email = normalized_email
        _set_student_parents(db, student, data.parent_user_ids, student.school_id)

        if linked_user and normalized_email:
            linked_user.email = normalized_email

        _sync_student_user(db, student, password=data.password, linked_user=linked_user)

        db.commit()
        db.refresh(student)
        return student
    except HTTPException:
        raise
    except IntegrityError as exc:
        logger.exception("Constraint error while updating student id=%s", student_id)
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Student update violates database constraints: {_sqlalchemy_error_detail(exc)}")
    except SQLAlchemyError as exc:
        logger.exception("DB error while updating student id=%s", student_id)
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Unable to update student: {_sqlalchemy_error_detail(exc)}")
    except Exception:
        logger.exception("Unexpected error while updating student id=%s", student_id)
        db.rollback()
        raise HTTPException(status_code=500, detail="Unable to update student right now")


@router.delete("/{student_id}")
def delete_student(student_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        query = db.query(Student).filter(Student.id == student_id)
        if current_user.role != UserRole.SUPER_ADMIN:
            if not current_user.school_id:
                raise HTTPException(status_code=400, detail="No school associated")
            query = query.filter(Student.school_id == current_user.school_id)

        student = query.first()
        if not student:
            raise HTTPException(status_code=404, detail="Student not found")
        student.is_active = False

        if student.email:
            linked_user = db.query(User).filter(func.lower(User.email) == student.email.lower()).first()
            if linked_user and linked_user.role == UserRole.STUDENT:
                linked_user.is_active = False

        db.commit()
        return {"message": "Deleted"}
    except HTTPException:
        raise
    except SQLAlchemyError as exc:
        logger.exception("DB error while deleting student id=%s", student_id)
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Unable to delete student: {_sqlalchemy_error_detail(exc)}")
    except Exception:
        logger.exception("Unexpected error while deleting student id=%s", student_id)
        db.rollback()
        raise HTTPException(status_code=500, detail="Unable to delete student right now")
