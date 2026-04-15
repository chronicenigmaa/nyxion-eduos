from pydantic import BaseModel, EmailStr
from typing import Optional
import uuid

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