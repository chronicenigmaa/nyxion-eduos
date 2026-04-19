from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import verify_password, create_access_token, get_password_hash
from app.models.user import User
from app.models.school import School
from app.schemas.auth import LoginRequest, Token, UserCreate
from jose import JWTError
from app.core.config import settings
from fastapi.security import OAuth2PasswordBearer
from app.core.security import decode_token
import uuid
from datetime import datetime, timedelta
from jose import jwt

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

@router.get("/sso-token")
def get_sso_token(current_user: User = Depends(get_current_user)):
    payload = {
        "sub": str(current_user.id),
        "name": current_user.name,
        "email": current_user.email,
        "role": current_user.role.value,
        "exp": datetime.utcnow() + timedelta(minutes=5)
    }
    from jose import jwt
    token = jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return {"token": token}


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    try:
        payload = decode_token(token)
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = db.query(User).filter(User.id == uuid.UUID(user_id)).first()
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

@router.post("/login", response_model=Token)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == request.email).first()
    if not user or not verify_password(request.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    school = db.query(School).filter(School.id == user.school_id).first() if user.school_id else None

    token = create_access_token({
        "sub": str(user.id),
        "school_id": str(user.school_id) if user.school_id else None,
        "role": user.role.value
    })

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": str(user.id),
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role.value,
            "school_id": str(user.school_id) if user.school_id else None,
            "school_name": school.name if school else None
        }
    }

@router.get("/me")
def get_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    school = db.query(School).filter(School.id == current_user.school_id).first() if current_user.school_id else None
    return {
        "id": str(current_user.id),
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": current_user.role.value,
        "school_id": str(current_user.school_id) if current_user.school_id else None,
        "school_name": school.name if school else None
    }
    
@router.get("/sso-token")
def get_sso_token(current_user: User = Depends(get_current_user)):
    payload = {
        "sub": str(current_user.id),
        "name": current_user.name,
        "email": current_user.email,
        "role": current_user.role.value,
        "exp": datetime.utcnow() + timedelta(minutes=5)
    }
    token = jwt.encode(payload, SECRET_KEY, algorithm="HS256")
    return {"token": token}