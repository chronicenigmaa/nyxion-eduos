from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.timetable import TimetableEntry
from app.models.user import User
from app.api.v1.endpoints.auth import get_current_user
from pydantic import BaseModel
from typing import Optional, List
import uuid

router = APIRouter()

class TimetableCreate(BaseModel):
    class_name: str
    section: Optional[str] = None
    day: str
    period: int
    start_time: str
    end_time: str
    subject_name: str
    teacher_name: Optional[str] = None
    room: Optional[str] = None

@router.get("/")
def get_timetable(class_name: Optional[str] = None,
                  db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    q = db.query(TimetableEntry).filter(TimetableEntry.school_id == current_user.school_id)
    if class_name:
        q = q.filter(TimetableEntry.class_name == class_name)
    entries = q.order_by(TimetableEntry.day, TimetableEntry.period).all()
    days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
    result = {day: [] for day in days}
    for e in entries:
        if e.day in result:
            result[e.day].append({
                "id": str(e.id),
                "period": e.period,
                "start_time": e.start_time,
                "end_time": e.end_time,
                "subject_name": e.subject_name,
                "teacher_name": e.teacher_name,
                "room": e.room,
                "class_name": e.class_name,
                "section": e.section
            })
    return result

@router.post("/")
def add_entry(data: TimetableCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    entry = TimetableEntry(**data.dict(), school_id=current_user.school_id)
    db.add(entry)
    db.commit()
    return {"message": "Entry added"}

@router.delete("/{entry_id}")
def delete_entry(entry_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    entry = db.query(TimetableEntry).filter(
        TimetableEntry.id == entry_id,
        TimetableEntry.school_id == current_user.school_id
    ).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(entry)
    db.commit()
    return {"message": "Deleted"}