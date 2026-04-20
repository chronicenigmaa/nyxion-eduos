# ─────────────────────────────────────────────────────────────────────────────
# PATCH FILE: backend/app/api/v1/endpoints/schools.py
#
# ADD these two routes to your existing schools.py file.
# Place them after your existing POST / GET routes.
# ─────────────────────────────────────────────────────────────────────────────

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from app.core.database import get_db
from app.core.security import get_password_hash
from app.core.auth import get_current_user
from app.models.user import User, UserRole
from app.models.school import School
import uuid

router = APIRouter()


# ── Schema for creating an admin user ────────────────────────────────────────
class CreateAdminUserRequest(BaseModel):
    full_name: str
    email: EmailStr
    password: str


class AdminUserResponse(BaseModel):
    id: str
    full_name: str
    email: str
    role: str
    school_id: str

    class Config:
        from_attributes = True


# ── POST /schools/{school_id}/admins — Create admin user for a school ────────
@router.post(
    "/{school_id}/admins",
    response_model=AdminUserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create an admin user for a specific school"
)
def create_school_admin(
    school_id: uuid.UUID,
    payload: CreateAdminUserRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Only super admins can create school admins
    if current_user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Only super admins can create school admin accounts")

    # Confirm the school exists
    school = db.query(School).filter(School.id == school_id).first()
    if not school:
        raise HTTPException(status_code=404, detail="School not found")

    # Check email is not already taken
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="A user with this email already exists")

    # Create the admin user
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

    return AdminUserResponse(
        id=str(new_admin.id),
        full_name=new_admin.full_name,
        email=new_admin.email,
        role=new_admin.role.value,
        school_id=str(new_admin.school_id),
    )


# ── GET /schools/{school_id}/admins — List all admin users for a school ──────
@router.get(
    "/{school_id}/admins",
    summary="List all admin users for a specific school"
)
def list_school_admins(
    school_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != UserRole.SUPER_ADMIN:
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


# ── DELETE /schools/{school_id} — Delete a school ────────────────────────────
@router.delete(
    "/{school_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete a school and all its associated users"
)
def delete_school(
    school_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Only super admins can delete schools
    if current_user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Only super admins can delete schools")

    school = db.query(School).filter(School.id == school_id).first()
    if not school:
        raise HTTPException(status_code=404, detail="School not found")

    school_name = school.name

    # Delete all users belonging to this school first (cascade safety)
    db.query(User).filter(User.school_id == school_id).delete()

    # Delete the school
    db.delete(school)
    db.commit()

    return {"message": f"School '{school_name}' and all its users have been deleted successfully"}