from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.attendance import Attendance, AttendanceStatus
from app.models.student import Student
from app.models.user import User
from app.api.v1.endpoints.auth import get_current_user
from pydantic import BaseModel
from typing import Optional, List
import uuid
from datetime import date

router = APIRouter()

class AttendanceRecord(BaseModel):
    student_id: uuid.UUID
    status: AttendanceStatus
    remarks: Optional[str] = None

class AttendanceBulk(BaseModel):
    date: date
    records: List[AttendanceRecord]

@router.post("/mark")
def mark_attendance(data: AttendanceBulk, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    for record in data.records:
        existing = db.query(Attendance).filter(
            Attendance.student_id == record.student_id,
            Attendance.date == data.date,
            Attendance.school_id == current_user.school_id
        ).first()
        if existing:
            existing.status = record.status
            existing.remarks = record.remarks
        else:
            att = Attendance(
                school_id=current_user.school_id,
                student_id=record.student_id,
                date=data.date,
                status=record.status,
                remarks=record.remarks
            )
            db.add(att)
    db.commit()
    return {"message": f"Attendance marked for {len(data.records)} students"}

@router.get("/report")
def get_report(date: Optional[date] = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from datetime import date as today_date
    target_date = date or today_date.today()
    records = db.query(Attendance).filter(
        Attendance.school_id == current_user.school_id,
        Attendance.date == target_date
    ).all()
    students = db.query(Student).filter(
        Student.school_id == current_user.school_id,
        Student.is_active == True
    ).all()
    attendance_map = {str(r.student_id): r.status for r in records}
    return {
        "date": str(target_date),
        "total": len(students),
        "present": sum(1 for r in records if r.status == AttendanceStatus.PRESENT),
        "absent": sum(1 for r in records if r.status == AttendanceStatus.ABSENT),
        "late": sum(1 for r in records if r.status == AttendanceStatus.LATE),
        "records": [
            {
                "student_id": str(s.id),
                "student_name": s.full_name,
                "roll_number": s.roll_number,
                "class_name": s.class_name,
                "status": attendance_map.get(str(s.id), "not_marked")
            }
            for s in students
        ]
    }