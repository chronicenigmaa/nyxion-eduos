from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.school import School
from app.models.user import User
from app.api.v1.endpoints.auth import get_current_user
from pydantic import BaseModel
from typing import Optional
import uuid

router = APIRouter()

class SchoolCreate(BaseModel):
    name: str
    code: str
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None

@router.get("/")
def list_schools(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    schools = db.query(School).filter(School.is_active == True).all()
    return [{"id": str(s.id), "name": s.name, "code": s.code, "email": s.email, "phone": s.phone} for s in schools]

@router.post("/")
def create_school(data: SchoolCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role.value != "super_admin":
        raise HTTPException(status_code=403, detail="Only super admins can create schools")
    school = School(**data.dict())
    db.add(school)
    db.commit()
    db.refresh(school)
    return {"id": str(school.id), "name": school.name, "code": school.code}

# backend/app/api/v1/endpoints/schools.py — add this route:

@router.patch("/{school_id}/features")
def update_features(school_id: uuid.UUID, features: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role.value != "super_admin":
        raise HTTPException(status_code=403, detail="Only super admins can update features")
    school = db.query(School).filter(School.id == school_id).first()
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
    school.features = features
    db.commit()
    return {"message": "Features updated", "features": school.features}

@router.patch("/{school_id}/package")
def update_package(school_id: uuid.UUID, package: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role.value != "super_admin":
        raise HTTPException(status_code=403, detail="Only super admins")
    school = db.query(School).filter(School.id == school_id).first()
    school.package = package
    db.commit()
    return {"message": f"Package updated to {package}"}