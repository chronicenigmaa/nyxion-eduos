from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.student import Student
from app.models.school import School
from app.models.user import User, UserRole
from app.schemas.student import StudentCreate, StudentOut
from app.api.v1.endpoints.auth import get_current_user
from typing import List
from pydantic import BaseModel
import logging
import uuid

router = APIRouter()
logger = logging.getLogger("nyxion.students")


class StudentUpdate(BaseModel):
    full_name: str
    father_name: str | None = None
    roll_number: str | None = None
    class_name: str | None = None
    section: str | None = None
    phone: str | None = None
    address: str | None = None


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


@router.get("/", response_model=List[StudentOut])
def list_students(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        if current_user.role.value == "super_admin":
            return db.query(Student).filter(Student.is_active == True).all()
        if not current_user.school_id:
            raise HTTPException(status_code=400, detail="No school associated")
        return db.query(Student).filter(
            Student.school_id == current_user.school_id,
            Student.is_active == True
        ).all()
    except HTTPException:
        raise
    except SQLAlchemyError:
        logger.exception("DB error while listing students")
        db.rollback()
        raise HTTPException(status_code=500, detail="Unable to load students right now")
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

        payload = data.dict(exclude={"school_id"})
        student = Student(
            **payload,
            full_name=normalized_name or data.full_name,
            father_name=normalized_father_name,
            class_name=normalized_class_name,
            section=normalized_section,
            roll_number=normalized_roll,
            school_id=target_school_id,
        )
        db.add(student)
        db.commit()
        db.refresh(student)
        return student
    except HTTPException:
        raise
    except IntegrityError:
        logger.exception("Constraint error while creating student")
        db.rollback()
        raise HTTPException(status_code=400, detail="Student data violates database constraints")
    except SQLAlchemyError:
        logger.exception("DB error while creating student")
        db.rollback()
        raise HTTPException(status_code=500, detail="Unable to save student right now")
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

        student.full_name = normalized_name or data.full_name
        student.father_name = normalized_father_name
        student.roll_number = normalized_roll
        student.class_name = normalized_class_name
        student.section = normalized_section
        student.phone = data.phone
        student.address = data.address

        db.commit()
        db.refresh(student)
        return student
    except HTTPException:
        raise
    except IntegrityError:
        logger.exception("Constraint error while updating student id=%s", student_id)
        db.rollback()
        raise HTTPException(status_code=400, detail="Student update violates database constraints")
    except SQLAlchemyError:
        logger.exception("DB error while updating student id=%s", student_id)
        db.rollback()
        raise HTTPException(status_code=500, detail="Unable to update student right now")
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
        db.commit()
        return {"message": "Deleted"}
    except HTTPException:
        raise
    except SQLAlchemyError:
        logger.exception("DB error while deleting student id=%s", student_id)
        db.rollback()
        raise HTTPException(status_code=500, detail="Unable to delete student right now")
    except Exception:
        logger.exception("Unexpected error while deleting student id=%s", student_id)
        db.rollback()
        raise HTTPException(status_code=500, detail="Unable to delete student right now")
