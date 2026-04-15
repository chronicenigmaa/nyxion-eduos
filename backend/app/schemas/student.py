from pydantic import BaseModel
from typing import Optional
import uuid
from datetime import date, datetime

class StudentCreate(BaseModel):
    full_name: str
    father_name: Optional[str] = None
    roll_number: Optional[str] = None
    class_name: Optional[str] = None
    section: Optional[str] = None
    date_of_birth: Optional[date] = None
    phone: Optional[str] = None
    address: Optional[str] = None

class StudentOut(BaseModel):
    id: uuid.UUID
    school_id: uuid.UUID
    full_name: str
    father_name: Optional[str]
    roll_number: Optional[str]
    class_name: Optional[str]
    section: Optional[str]
    phone: Optional[str]
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True