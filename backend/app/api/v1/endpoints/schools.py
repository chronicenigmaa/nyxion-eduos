from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from typing import Dict, List, Optional
from app.core.database import get_db
from app.core.security import get_password_hash
from app.api.v1.endpoints.auth import get_current_user
from app.models.school import School, get_school_features, get_package_features
from app.models.user import User, UserRole
from app.models.teacher import Teacher
from app.models.student import Student
from app.models.subject import Subject
from app.models.class_section import ClassSection
import uuid

router = APIRouter()


# ── Schemas ───────────────────────────────────────────────────────────────────

class SchoolCreate(BaseModel):
    name: str
    code: str
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    package: Optional[str] = "starter"

class SchoolOut(BaseModel):
    id: uuid.UUID        # ← change from str to uuid.UUID
    name: str
    code: str
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    package: Optional[str] = None
    features: Dict[str, bool] = {}
    is_active: bool

    class Config:
        from_attributes = True

class PackageUpdate(BaseModel):
    package: str

class FeatureUpdate(BaseModel):
    features: dict

class CreateAdminUserRequest(BaseModel):
    full_name: str
    email: EmailStr
    password: str


# ── GET /schools/ — list all schools ─────────────────────────────────────────

@router.get("", response_model=List[SchoolOut])
def list_schools(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role.value != "super_admin":
        raise HTTPException(status_code=403, detail="Only super admins can view all schools")

    schools = db.query(School).filter(School.is_active == True).all()
    return [
        {
            "id": school.id,
            "name": school.name,
            "code": school.code,
            "address": school.address,
            "phone": school.phone,
            "email": school.email,
            "package": school.package,
            "is_active": school.is_active,
            "features": get_school_features(school),
        }
        for school in schools
    ]


# ── POST /schools/ — create a school ─────────────────────────────────────────

@router.post("", response_model=SchoolOut, status_code=status.HTTP_201_CREATED)
def create_school(
    data: SchoolCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role.value != "super_admin":
        raise HTTPException(status_code=403, detail="Only super admins can create schools")

    normalized_code = data.code.strip().upper()
    normalized_name = data.name.strip()

    existing_by_code = db.query(School).filter(School.code == normalized_code).first()
    if existing_by_code and existing_by_code.is_active:
        raise HTTPException(status_code=400, detail="A school with this code already exists")

    existing_by_name = db.query(School).filter(func.lower(School.name) == normalized_name.lower()).first()
    if existing_by_name and existing_by_name.is_active and (
        not existing_by_code or existing_by_name.id != existing_by_code.id
    ):
        raise HTTPException(status_code=400, detail="A school with this name already exists")

    reactivated_school = None
    if existing_by_code and not existing_by_code.is_active:
        reactivated_school = existing_by_code
    elif existing_by_name and not existing_by_name.is_active:
        reactivated_school = existing_by_name

    if reactivated_school:
        reactivated_school.name = normalized_name
        reactivated_school.code = normalized_code
        reactivated_school.address = data.address
        reactivated_school.phone = data.phone
        reactivated_school.email = data.email
        reactivated_school.package = data.package or "starter"
        reactivated_school.features = {}
        reactivated_school.is_active = True
        db.commit()
        db.refresh(reactivated_school)
        return reactivated_school

    school = School(
        name=normalized_name,
        code=normalized_code,
        address=data.address,
        phone=data.phone,
        email=data.email,
        package=data.package or "starter",
        features={},
        is_active=True,
    )
    db.add(school)
    db.commit()
    db.refresh(school)
    return school


# ── GET /schools/{school_id} — get a single school ───────────────────────────

@router.get("/{school_id}")
def get_school(
    school_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role.value != "super_admin":
        raise HTTPException(status_code=403, detail="Only super admins can view school details")

    school = db.query(School).filter(School.id == school_id, School.is_active == True).first()
    if not school:
        raise HTTPException(status_code=404, detail="School not found")

    return {
        "id": str(school.id),
        "name": school.name,
        "code": school.code,
        "address": school.address,
        "phone": school.phone,
        "email": school.email,
        "package": school.package,
        "is_active": school.is_active,
        "features": get_school_features(school),
    }


# ── PATCH /schools/{school_id}/package — update package ──────────────────────

@router.patch("/{school_id}/package")
def update_package(
    school_id: uuid.UUID,
    data: PackageUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role.value != "super_admin":
        raise HTTPException(status_code=403, detail="Only super admins can update packages")

    school = db.query(School).filter(School.id == school_id).first()
    if not school:
        raise HTTPException(status_code=404, detail="School not found")

    if data.package not in ["starter", "growth", "elite"]:
        raise HTTPException(status_code=400, detail="Invalid package. Must be starter, growth, or elite")

    school.package = data.package
    school.features = {}
    db.commit()
    db.refresh(school)

    return {
        "message": f"Package updated to {data.package}",
        "features": get_school_features(school),
    }


# ── PATCH /schools/{school_id}/features — toggle individual features ──────────

@router.patch("/{school_id}/features")
def update_features(
    school_id: uuid.UUID,
    data: FeatureUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role.value != "super_admin":
        raise HTTPException(status_code=403, detail="Only super admins can toggle features")

    school = db.query(School).filter(School.id == school_id).first()
    if not school:
        raise HTTPException(status_code=404, detail="School not found")

    current_features = school.features or {}
    current_features.update(data.features)
    school.features = current_features
    db.commit()
    db.refresh(school)

    return {
        "message": "Features updated",
        "features": get_school_features(school),
    }


# ── GET /schools/{school_id}/admins — list admin users ───────────────────────

@router.get("/{school_id}/admins")
def list_school_admins(
    school_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role.value != "super_admin":
        raise HTTPException(status_code=403, detail="Only super admins can view school admins")

    school = db.query(School).filter(School.id == school_id).first()
    if not school:
        raise HTTPException(status_code=404, detail="School not found")

    admins = db.query(User).filter(
        User.school_id == school_id,
        User.role == UserRole.SCHOOL_ADMIN
    ).all()

    return [
        {
            "id": str(u.id),
            "full_name": u.full_name,
            "email": u.email,
            "role": u.role.value,
            "is_active": u.is_active,
        }
        for u in admins
    ]


# ── POST /schools/{school_id}/admins — create admin user for a school ─────────

@router.post("/{school_id}/admins", status_code=status.HTTP_201_CREATED)
def create_school_admin(
    school_id: uuid.UUID,
    payload: CreateAdminUserRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role.value != "super_admin":
        raise HTTPException(status_code=403, detail="Only super admins can create school admin accounts")

    school = db.query(School).filter(School.id == school_id).first()
    if not school:
        raise HTTPException(status_code=404, detail="School not found")

    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="A user with this email already exists")

    new_admin = User(
        full_name=payload.full_name,
        email=payload.email,
        hashed_password=get_password_hash(payload.password),
        role=UserRole.SCHOOL_ADMIN,
        school_id=school_id,
        is_active=True,
    )
    db.add(new_admin)
    db.commit()
    db.refresh(new_admin)

    return {
        "id": str(new_admin.id),
        "full_name": new_admin.full_name,
        "email": new_admin.email,
        "role": new_admin.role.value,
        "school_id": str(new_admin.school_id),
    }


# ── DELETE /schools/{school_id} — delete a school ────────────────────────────

@router.delete("/{school_id}")
def delete_school(
    school_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role.value != "super_admin":
        raise HTTPException(status_code=403, detail="Only super admins can delete schools")

    school = db.query(School).filter(School.id == school_id).first()
    if not school:
        raise HTTPException(status_code=404, detail="School not found")

    school_name = school.name

    # Remove all users belonging to this school first
    db.query(User).filter(User.school_id == school_id).delete()

    # Soft delete school-linked academic data
    db.query(Teacher).filter(Teacher.school_id == school_id).update({"is_active": False}, synchronize_session=False)
    db.query(Student).filter(Student.school_id == school_id).update({"is_active": False}, synchronize_session=False)
    db.query(Subject).filter(Subject.school_id == school_id).update({"is_active": False}, synchronize_session=False)
    db.query(ClassSection).filter(ClassSection.school_id == school_id).update({"is_active": False}, synchronize_session=False)

    # Soft delete the school
    school.is_active = False
    db.commit()

    return {"message": f"School '{school_name}' has been deleted successfully"}
