from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import verify_password, create_access_token, get_password_hash, decode_token
from app.models.user import User, UserRole
from app.models.school import School
from app.models.password_reset import PasswordResetToken
from app.schemas.auth import LoginRequest, Token, UserCreate
from app.core.config import settings
from app.core.email import (
    email_enabled,
    send_password_changed_email,
    send_password_reset_email,
)
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel, EmailStr
from jose import JWTError, jwt
import hashlib
import logging
import secrets
import uuid
from datetime import datetime, timedelta
from app.core.logging_client import log_event   # add with the other imports, top of file


logger = logging.getLogger("nyxion.auth")

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

MIN_PASSWORD_LENGTH = 6


def identity_payload(db: Session, user: User) -> dict:
    """The user object returned by /login and /me.

    EduOS is the system of record for accounts: LearnSpace signs people in by
    posting their credentials here and provisions its own row from this
    payload. That is why a student's roll_number / class / section and a
    teacher's subject are included — without them LearnSpace creates a student
    with no roll number, and the parent-link sync (which matches on roll
    number) can never find them.
    """
    school = db.query(School).filter(School.id == user.school_id).first() if user.school_id else None

    payload = {
        "id": str(user.id),
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role.value,
        "school_id": str(user.school_id) if user.school_id else None,
        "school_name": school.name if school else None,
        "must_change_password": user.must_change_password,
    }

    if user.role == UserRole.STUDENT and user.email:
        from app.models.student import Student

        student = db.query(Student).filter(
            func.lower(Student.email) == user.email.lower(),
            Student.is_active == True,
        ).first()
        if student:
            payload.update({
                "roll_number": student.roll_number,
                "class_name": student.class_name,
                "section": student.section,
            })

    if user.role == UserRole.TEACHER and user.email:
        from app.models.teacher import Teacher

        teacher = db.query(Teacher).filter(
            func.lower(Teacher.email) == user.email.lower(),
            Teacher.is_active == True,
        ).first()
        if teacher:
            payload["subject"] = teacher.subject

    return payload


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


def _hash_reset_token(raw_token: str) -> str:
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    try:
        payload = decode_token(token)
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = db.query(User).filter(User.id == uuid.UUID(user_id)).first()
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        if not user.is_active:
            raise HTTPException(status_code=401, detail="Account is deactivated")
        return user
    except (JWTError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid token")


@router.post("/login", response_model=Token)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    email = request.email.strip().lower()
    user = db.query(User).filter(func.lower(User.email) == email).first()
    if not user or not verify_password(request.password, user.hashed_password):
        log_event("warning", "auth.login_failed", detail_email=email)
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not user.is_active:
        log_event("warning", "auth.login_deactivated", user_id=str(user.id))
        raise HTTPException(status_code=403, detail="This account has been deactivated. Contact your administrator.")
    token = create_access_token({
        "sub": str(user.id),
        "school_id": str(user.school_id) if user.school_id else None,
        "role": user.role.value
    })
    log_event("info", "auth.login", user_id=str(user.id), role=user.role.value)

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": identity_payload(db, user),
    }


@router.get("/me")
def get_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return identity_payload(db, current_user)


@router.post("/change-password")
def change_password(
    payload: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    if len(payload.new_password) < MIN_PASSWORD_LENGTH:
        raise HTTPException(status_code=400, detail=f"New password must be at least {MIN_PASSWORD_LENGTH} characters")

    current_user.hashed_password = get_password_hash(payload.new_password)
    current_user.must_change_password = False
    db.commit()
    db.refresh(current_user)

    send_password_changed_email(current_user.email, current_user.full_name)

    return {
        "message": "Password changed successfully",
        "user": identity_payload(db, current_user),
    }


# ── Forgot / reset password ──────────────────────────────────────────────────

GENERIC_FORGOT_RESPONSE = {
    "message": "If an account exists for that email address, a password reset link has been sent."
}


@router.post("/forgot-password")
def forgot_password(
    payload: ForgotPasswordRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    """Start a password reset.

    Always returns the same response whether or not the account exists, so the
    endpoint cannot be used to enumerate registered email addresses.
    """
    email = payload.email.strip().lower()
    user = db.query(User).filter(func.lower(User.email) == email).first()

    if not user or not user.is_active:
        log_event("info", "auth.forgot_password_unknown", detail_email=email)
        return GENERIC_FORGOT_RESPONSE

    # Invalidate any outstanding tokens for this user — one live link at a time.
    db.query(PasswordResetToken).filter(
        PasswordResetToken.user_id == user.id,
        PasswordResetToken.used_at.is_(None),
    ).update({"used_at": datetime.utcnow()}, synchronize_session=False)

    raw_token = secrets.token_urlsafe(48)
    reset_token = PasswordResetToken(
        user_id=user.id,
        token_hash=_hash_reset_token(raw_token),
        expires_at=datetime.utcnow() + timedelta(minutes=settings.RESET_TOKEN_EXPIRE_MINUTES),
        requested_ip=request.client.host if request.client else None,
    )
    db.add(reset_token)
    db.commit()

    reset_url = f"{settings.FRONTEND_URL}/reset-password?token={raw_token}"
    delivered = send_password_reset_email(
        user.email, user.full_name, reset_url, settings.RESET_TOKEN_EXPIRE_MINUTES
    )
    log_event(
        "info" if delivered else "warning",
        "auth.forgot_password",
        user_id=str(user.id),
        detail_delivered=delivered,
    )

    if not delivered and not settings.is_production:
        # Dev convenience: no email provider configured, hand back the link.
        logger.warning("Password reset link for %s: %s", user.email, reset_url)
        return {**GENERIC_FORGOT_RESPONSE, "debug_reset_url": reset_url}

    return GENERIC_FORGOT_RESPONSE


@router.get("/reset-password/validate")
def validate_reset_token(token: str, db: Session = Depends(get_db)):
    """Let the reset page tell the user up front that a link is stale."""
    record = db.query(PasswordResetToken).filter(
        PasswordResetToken.token_hash == _hash_reset_token(token)
    ).first()

    if not record or not record.is_usable:
        return {"valid": False}

    user = db.query(User).filter(User.id == record.user_id).first()
    if not user or not user.is_active:
        return {"valid": False}

    return {"valid": True, "email": user.email, "full_name": user.full_name}


@router.post("/reset-password")
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    if len(payload.new_password) < MIN_PASSWORD_LENGTH:
        raise HTTPException(
            status_code=400,
            detail=f"Password must be at least {MIN_PASSWORD_LENGTH} characters",
        )

    record = db.query(PasswordResetToken).filter(
        PasswordResetToken.token_hash == _hash_reset_token(payload.token)
    ).first()

    if not record or not record.is_usable:
        raise HTTPException(
            status_code=400,
            detail="This reset link is invalid or has expired. Please request a new one.",
        )

    user = db.query(User).filter(User.id == record.user_id).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=400, detail="This account is no longer active.")

    user.hashed_password = get_password_hash(payload.new_password)
    user.must_change_password = False
    record.used_at = datetime.utcnow()
    db.commit()

    send_password_changed_email(user.email, user.full_name)
    log_event("info", "auth.password_reset", user_id=str(user.id))

    return {"message": "Password updated. You can now sign in with your new password."}


@router.get("/email-status")
def email_status():
    """Whether password-reset emails can actually be delivered right now."""
    return {
        "email_configured": email_enabled(),
        "from": settings.MAIL_FROM if email_enabled() else None,
        "frontend_url": settings.FRONTEND_URL,
    }


@router.get("/sso-token")
def get_sso_token(current_user: User = Depends(get_current_user)):
    payload = {
        "sub": str(current_user.id),
        "name": current_user.full_name,
        "email": current_user.email,
        "role": current_user.role.value,
        "exp": datetime.utcnow() + timedelta(minutes=5)
    }
    token = jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return {"token": token}


