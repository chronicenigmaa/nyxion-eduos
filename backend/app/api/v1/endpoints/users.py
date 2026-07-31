from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_password_hash
from app.models.user import User, UserRole
from app.api.v1.endpoints.auth import get_current_user
from pydantic import BaseModel, EmailStr
from typing import Optional
import uuid

router = APIRouter()


MIN_PASSWORD_LENGTH = 6


class UserCreateRequest(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    role: UserRole
    school_id: Optional[uuid.UUID] = None
    # New accounts are asked to pick their own password on first sign-in.
    must_change_password: bool = True


class UserOut(BaseModel):
    id: uuid.UUID
    full_name: str
    email: str
    role: UserRole
    school_id: Optional[uuid.UUID] = None
    is_active: bool
    must_change_password: bool = False

    class Config:
        from_attributes = True


def _is_super_admin(current_user: User) -> bool:
    return current_user.role == UserRole.SUPER_ADMIN


def _assert_can_manage_users(current_user: User):
    if current_user.role not in (UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN):
        raise HTTPException(status_code=403, detail="You are not allowed to manage users")


def _active_super_admin_count(db: Session, exclude_id: Optional[uuid.UUID] = None) -> int:
    query = db.query(User).filter(
        User.role == UserRole.SUPER_ADMIN,
        User.is_active == True,
    )
    if exclude_id:
        query = query.filter(User.id != exclude_id)
    return query.count()


def _assert_email_available(db: Session, email: str, exclude_id: Optional[uuid.UUID] = None):
    query = db.query(User).filter(func.lower(User.email) == email.lower())
    if exclude_id:
        query = query.filter(User.id != exclude_id)
    if query.first():
        raise HTTPException(status_code=400, detail="A user with this email already exists")


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

    email = payload.email.strip().lower()
    _assert_email_available(db, email)

    if len(payload.password) < MIN_PASSWORD_LENGTH:
        raise HTTPException(
            status_code=400,
            detail=f"Password must be at least {MIN_PASSWORD_LENGTH} characters",
        )

    target_school_id = payload.school_id

    if _is_super_admin(current_user):
        if payload.role == UserRole.SUPER_ADMIN:
            # Super admins are global — never scope them to a school.
            target_school_id = None
        elif not target_school_id:
            raise HTTPException(status_code=400, detail="school_id is required for non-super-admin users")
    else:
        if not current_user.school_id:
            raise HTTPException(status_code=400, detail="No school associated")
        if payload.role not in (UserRole.TEACHER, UserRole.PARENT, UserRole.STUDENT):
            raise HTTPException(status_code=403, detail="School admins can only create teacher, parent, or student users")
        target_school_id = current_user.school_id

    user = User(
        full_name=payload.full_name,
        email=email,
        hashed_password=get_password_hash(payload.password),
        role=payload.role,
        school_id=target_school_id,
        is_active=True,
        must_change_password=payload.must_change_password,
    )

    db.add(user)
    db.commit()
    db.refresh(user)
    return user


class UserUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[UserRole] = None
    school_id: Optional[uuid.UUID] = None
    new_password: Optional[str] = None


@router.patch("/{user_id}", response_model=UserOut)
def update_user(
    user_id: uuid.UUID,
    payload: UserUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _assert_can_manage_users(current_user)

    query = db.query(User).filter(User.id == user_id)
    if not _is_super_admin(current_user):
        if not current_user.school_id:
            raise HTTPException(status_code=400, detail="No school associated")
        query = query.filter(User.school_id == current_user.school_id)

    user = query.first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if payload.full_name is not None:
        user.full_name = payload.full_name

    if payload.email is not None:
        new_email = payload.email.strip().lower()
        _assert_email_available(db, new_email, exclude_id=user_id)
        user.email = new_email

    if payload.role is not None and payload.role != user.role:
        if not _is_super_admin(current_user):
            raise HTTPException(status_code=403, detail="Only super admins can change roles")
        # Don't allow the platform to be left without a super admin.
        if user.role == UserRole.SUPER_ADMIN and _active_super_admin_count(db, exclude_id=user.id) == 0:
            raise HTTPException(
                status_code=400,
                detail="This is the last super admin. Create another super admin before changing this role.",
            )
        user.role = payload.role
        if payload.role == UserRole.SUPER_ADMIN:
            user.school_id = None

    if payload.school_id is not None and user.role != UserRole.SUPER_ADMIN:
        if not _is_super_admin(current_user):
            # A school admin must never be able to move a user into another school.
            if payload.school_id != current_user.school_id:
                raise HTTPException(status_code=403, detail="You can only assign users to your own school")
        user.school_id = payload.school_id

    if payload.new_password is not None:
        if len(payload.new_password) < MIN_PASSWORD_LENGTH:
            raise HTTPException(
                status_code=400,
                detail=f"Password must be at least {MIN_PASSWORD_LENGTH} characters",
            )
        user.hashed_password = get_password_hash(payload.new_password)
        # Force the user to pick their own password on next sign-in, unless an
        # admin is resetting their own account.
        user.must_change_password = user.id != current_user.id

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

    if user.role == UserRole.SUPER_ADMIN and _active_super_admin_count(db, exclude_id=user.id) == 0:
        raise HTTPException(
            status_code=400,
            detail="This is the last super admin. Create another super admin before removing this one.",
        )

    user.is_active = False
    db.commit()

    return {"message": "User deactivated"}
