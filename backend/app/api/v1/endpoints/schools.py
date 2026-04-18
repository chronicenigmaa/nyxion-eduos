from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.school import School, DEFAULT_FEATURES, PACKAGE_FEATURES
from app.models.user import User, UserRole
from app.api.v1.endpoints.auth import get_current_user
from pydantic import BaseModel
from typing import Optional, Dict
import uuid

router = APIRouter()

class SchoolCreate(BaseModel):
    name: str
    code: str
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    package: str = "starter"

class PackageUpdate(BaseModel):
    package: str

class FeaturesUpdate(BaseModel):
    features: Dict[str, bool]

def get_school_features(school: School) -> dict:
    if not school:
        return {k: True for k in DEFAULT_FEATURES}
    package = school.package or "starter"
    allowed = PACKAGE_FEATURES.get(package, [])
    base = dict(DEFAULT_FEATURES)
    if allowed == "all":
        base = {k: True for k in DEFAULT_FEATURES}
    else:
        base = {k: k in allowed for k in DEFAULT_FEATURES}
    # Apply manual overrides
    overrides = school.features or {}
    for k, v in overrides.items():
        if k in base:
            base[k] = v
    return base

@router.get("/")
def list_schools(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role.value == "super_admin":
        schools = db.query(School).filter(School.is_active == True).all()
    elif current_user.school_id:
        schools = db.query(School).filter(School.id == current_user.school_id).all()
    else:
        return []
    return [
        {
            "id": str(s.id), "name": s.name, "code": s.code,
            "email": s.email, "phone": s.phone, "package": s.package,
            "features": get_school_features(s)
        }
        for s in schools
    ]

@router.get("/my-features")
def my_features(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    school = db.query(School).filter(School.id == current_user.school_id).first() if current_user.school_id else None
    return get_school_features(school)

@router.post("/")
def create_school(data: SchoolCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role.value != "super_admin":
        raise HTTPException(status_code=403, detail="Only super admins can create schools")
    school = School(**data.dict(), features=DEFAULT_FEATURES)
    db.add(school)
    db.commit()
    db.refresh(school)
    return {"id": str(school.id), "name": school.name, "code": school.code}

@router.patch("/{school_id}/package")
def update_package(school_id: uuid.UUID, data: PackageUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role.value != "super_admin":
        raise HTTPException(status_code=403, detail="Only super admins")
    school = db.query(School).filter(School.id == school_id).first()
    if not school:
        raise HTTPException(status_code=404, detail="Not found")
    school.package = data.package
    db.commit()
    return {"message": f"Package updated to {data.package}", "features": get_school_features(school)}

@router.patch("/{school_id}/features")
def update_features(school_id: uuid.UUID, data: FeaturesUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role.value != "super_admin":
        raise HTTPException(status_code=403, detail="Only super admins")
    school = db.query(School).filter(School.id == school_id).first()
    if not school:
        raise HTTPException(status_code=404, detail="Not found")
    current = dict(school.features or DEFAULT_FEATURES)
    current.update(data.features)
    school.features = current
    db.commit()
    return {"message": "Features updated", "features": get_school_features(school)}