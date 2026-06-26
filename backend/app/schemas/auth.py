from pydantic import BaseModel, EmailStr
from typing import Optional
import uuid
from app.core.logging_client import log_event

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: dict

class UserCreate(BaseModel):
    email: EmailStr
    full_name: str
    password: str
    role: str = "teacher"
    school_id: Optional[uuid.UUID] = None
    
    

# on bad credentials:
log_event("warning", "auth.login_failed", detail_email=request.email, ip=...)
# on success:
log_event("info", "auth.login", user_id=str(user.id), role=user.role.value)