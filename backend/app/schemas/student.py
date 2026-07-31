from pydantic import BaseModel, EmailStr
from typing import List, Optional
import uuid
from datetime import date, datetime


class ParentBrief(BaseModel):
    id: uuid.UUID
    full_name: str
    email: str

    class Config:
        from_attributes = True


class StudentCreate(BaseModel):
    full_name: str
    school_id: Optional[uuid.UUID] = None
    father_name: Optional[str] = None
    roll_number: Optional[str] = None
    class_name: Optional[str] = None
    section: Optional[str] = None
    date_of_birth: Optional[date] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    # Parent accounts to link. Omit to link none.
    parent_user_ids: Optional[List[uuid.UUID]] = None


class StudentOut(BaseModel):
    id: uuid.UUID
    school_id: uuid.UUID
    full_name: str
    father_name: Optional[str]
    roll_number: Optional[str]
    class_name: Optional[str]
    section: Optional[str]
    phone: Optional[str]
    address: Optional[str]
    email: Optional[EmailStr]
    parents: List[ParentBrief] = []
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True
