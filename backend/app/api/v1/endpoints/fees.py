from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.fee import Fee, FeeStatus
from app.models.student import Student
from app.models.user import User
from app.api.v1.endpoints.auth import get_current_user
from pydantic import BaseModel
from typing import Optional
import uuid
from datetime import datetime

router = APIRouter()

class FeeCreate(BaseModel):
    student_id: uuid.UUID
    amount: float
    month: str
    year: str
    due_date: Optional[datetime] = None
    remarks: Optional[str] = None

class FeeUpdate(BaseModel):
    paid_amount: float
    status: FeeStatus
    remarks: Optional[str] = None

@router.get("/")
def list_fees(status: Optional[str] = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    query = db.query(Fee, Student).join(Student).filter(Fee.school_id == current_user.school_id)
    if status:
        query = query.filter(Fee.status == status)
    results = query.all()
    return [
        {
            "id": str(f.id),
            "student_id": str(f.student_id),
            "student_name": s.full_name,
            "roll_number": s.roll_number,
            "amount": f.amount,
            "paid_amount": f.paid_amount,
            "month": f.month,
            "year": f.year,
            "status": f.status,
            "due_date": str(f.due_date) if f.due_date else None,
            "remarks": f.remarks
        }
        for f, s in results
    ]

@router.post("/")
def create_fee(data: FeeCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    fee = Fee(**data.dict(), school_id=current_user.school_id)
    db.add(fee)
    db.commit()
    db.refresh(fee)
    return {"id": str(fee.id), "message": "Fee created"}

@router.patch("/{fee_id}")
def update_fee(fee_id: uuid.UUID, data: FeeUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    fee = db.query(Fee).filter(Fee.id == fee_id, Fee.school_id == current_user.school_id).first()
    if not fee:
        raise HTTPException(status_code=404, detail="Fee not found")
    fee.paid_amount = data.paid_amount
    fee.status = data.status
    fee.remarks = data.remarks
    if data.status == FeeStatus.PAID:
        fee.paid_date = datetime.utcnow()
    db.commit()
    return {"message": "Updated"}

@router.get("/summary")
def fee_summary(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    fees = db.query(Fee).filter(Fee.school_id == current_user.school_id).all()
    return {
        "total": len(fees),
        "paid": sum(1 for f in fees if f.status == FeeStatus.PAID),
        "pending": sum(1 for f in fees if f.status == FeeStatus.PENDING),
        "overdue": sum(1 for f in fees if f.status == FeeStatus.OVERDUE),
        "total_amount": sum(f.amount for f in fees),
        "collected": sum(f.paid_amount for f in fees)
    }