from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_password_hash
from app.models.user import User, UserRole
from app.api.v1.endpoints.auth import get_current_user
from pydantic import BaseModel, EmailStr
from typing import Optional
import uuid

router = APIRouter()


class UserCreateRequest(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    role: UserRole
    school_id: Optional[uuid.UUID] = None


class UserOut(BaseModel):
    id: uuid.UUID
    full_name: str
    email: str
    role: UserRole
    school_id: Optional[uuid.UUID] = None
    is_active: bool

    class Config:
        from_attributes = True


def _is_super_admin(current_user: User) -> bool:
    return current_user.role == UserRole.SUPER_ADMIN


def _assert_can_manage_users(current_user: User):
    if current_user.role not in (UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN):
        raise HTTPException(status_code=403, detail="You are not allowed to manage users")


@router.get("", response_model=list[UserOut])
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    school_id: Optional[uuid.UUID] = Query(default=None),
):
    _assert_can_manage_users(current_user)

    query = db.query(User).filter(User.is_active == True)
    if _is_super_admin(current_user):
        if school_id:
            query = query.filter(User.school_id == school_id)
    else:
        if not current_user.school_id:
            raise HTTPException(status_code=400, detail="No school associated")
        query = query.filter(User.school_id == current_user.school_id)

    return query.order_by(User.created_at.desc()).all()


@router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _assert_can_manage_users(current_user)

    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="A user with this email already exists")

    target_school_id = payload.school_id

    if _is_super_admin(current_user):
        if payload.role != UserRole.SUPER_ADMIN and not target_school_id:
            raise HTTPException(status_code=400, detail="school_id is required for non-super-admin users")
    else:
        if not current_user.school_id:
            raise HTTPException(status_code=400, detail="No school associated")
        if payload.role not in (UserRole.TEACHER, UserRole.PARENT, UserRole.STUDENT):
            raise HTTPException(status_code=403, detail="School admins can only create teacher, parent, or student users")
        target_school_id = current_user.school_id

    user = User(
        full_name=payload.full_name,
        email=payload.email,
        hashed_password=get_password_hash(payload.password),
        role=payload.role,
        school_id=target_school_id,
        is_active=True,
    )

    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.delete("/{user_id}")
def deactivate_user(user_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    _assert_can_manage_users(current_user)

    query = db.query(User).filter(User.id == user_id)
    if not _is_super_admin(current_user):
        if not current_user.school_id:
            raise HTTPException(status_code=400, detail="No school associated")
        query = query.filter(User.school_id == current_user.school_id)

    user = query.first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot deactivate your own account")

    if current_user.role == UserRole.SCHOOL_ADMIN and user.role in (UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN):
        raise HTTPException(status_code=403, detail="School admins cannot deactivate admin accounts")

    user.is_active = False
    db.commit()

    return {"message": "User deactivated"}
