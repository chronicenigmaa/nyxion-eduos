from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.fee import Fee, FeeStatus
from app.models.student import Student
from app.models.teacher import Teacher
from app.models.subject import Subject
from app.models.class_section import ClassSection
from app.models.user import User
from app.api.v1.endpoints.auth import get_current_user
from pydantic import BaseModel
from typing import Optional
import uuid
from datetime import date, datetime

router = APIRouter()

class FeeCreate(BaseModel):
    student_id: Optional[uuid.UUID] = None
    student_name: Optional[str] = None
    roll_number: Optional[str] = None
    amount: float
    month: Optional[str] = None
    year: Optional[str | int] = None
    status: Optional[FeeStatus] = None
    paid_amount: Optional[float] = None
    due_date: Optional[datetime | date | str] = None
    remarks: Optional[str] = None

class FeeUpdate(BaseModel):
    student_id: Optional[uuid.UUID] = None
    student_name: Optional[str] = None
    roll_number: Optional[str] = None
    amount: Optional[float] = None
    month: Optional[str] = None
    year: Optional[str | int] = None
    paid_amount: Optional[float] = None
    status: Optional[FeeStatus] = None
    due_date: Optional[datetime | date | str] = None
    remarks: Optional[str] = None


def _normalize_due_date(value: Optional[datetime | date | str]) -> Optional[datetime]:
    if value in (None, ""):
        return None
    if isinstance(value, datetime):
        return value
    if isinstance(value, date):
        return datetime.combine(value, datetime.min.time())
    if isinstance(value, str):
        try:
            return datetime.fromisoformat(value)
        except ValueError:
            try:
                return datetime.strptime(value, "%Y-%m-%d")
            except ValueError as exc:
                raise HTTPException(status_code=400, detail="Invalid due date format. Use YYYY-MM-DD") from exc
    raise HTTPException(status_code=400, detail="Invalid due date value")


def _resolve_student(
    db: Session,
    *,
    school_id,
    student_id: Optional[uuid.UUID],
    student_name: Optional[str],
    roll_number: Optional[str],
) -> Student:
    query = db.query(Student).filter(
        Student.school_id == school_id,
        Student.is_active == True,
    )
    if student_id:
        student = query.filter(Student.id == student_id).first()
        if student:
            return student

    if roll_number:
        student = query.filter(Student.roll_number == roll_number.strip()).first()
        if student:
            return student

    if student_name:
        student = query.filter(Student.full_name == student_name.strip()).first()
        if student:
            return student

    raise HTTPException(status_code=404, detail="Student not found for fee record")

@router.get("/")
def list_fees(status: Optional[str] = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    query = db.query(Fee, Student).join(Student)
    if current_user.role.value != "super_admin":
        query = query.filter(Fee.school_id == current_user.school_id)
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
    student = _resolve_student(
        db,
        school_id=current_user.school_id,
        student_id=data.student_id,
        student_name=data.student_name,
        roll_number=data.roll_number,
    )
    fee = Fee(
        school_id=current_user.school_id,
        student_id=student.id,
        amount=data.amount,
        month=(data.month or "").strip() or None,
        year=str(data.year).strip() if data.year is not None else None,
        due_date=_normalize_due_date(data.due_date),
        remarks=data.remarks,
        status=data.status or FeeStatus.PENDING,
        paid_amount=data.paid_amount or 0,
    )
    db.add(fee)
    db.commit()
    db.refresh(fee)
    return {"id": str(fee.id), "message": "Fee created"}

@router.put("/{fee_id}")
@router.patch("/{fee_id}")
def update_fee(fee_id: uuid.UUID, data: FeeUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    fee = db.query(Fee).filter(Fee.id == fee_id, Fee.school_id == current_user.school_id).first()
    if not fee:
        raise HTTPException(status_code=404, detail="Fee not found")

    if data.student_id or data.student_name or data.roll_number:
        student = _resolve_student(
            db,
            school_id=current_user.school_id,
            student_id=data.student_id,
            student_name=data.student_name,
            roll_number=data.roll_number,
        )
        fee.student_id = student.id
    if data.amount is not None:
        fee.amount = data.amount
    if data.month is not None:
        fee.month = data.month.strip() or None
    if data.year is not None:
        fee.year = str(data.year).strip()
    if data.due_date is not None:
        fee.due_date = _normalize_due_date(data.due_date)
    if data.paid_amount is not None:
        fee.paid_amount = data.paid_amount
    if data.status is not None:
        fee.status = data.status
    if data.remarks is not None:
        fee.remarks = data.remarks
    if data.status == FeeStatus.PAID:
        fee.paid_date = datetime.utcnow()
    db.commit()
    return {"message": "Updated"}


@router.delete("/{fee_id}")
def delete_fee(fee_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    fee = db.query(Fee).filter(Fee.id == fee_id, Fee.school_id == current_user.school_id).first()
    if not fee:
        raise HTTPException(status_code=404, detail="Fee not found")
    db.delete(fee)
    db.commit()
    return {"message": "Deleted"}

@router.get("/summary")
def fee_summary(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    query = db.query(Fee)
    if current_user.role.value != "super_admin":
        query = query.filter(Fee.school_id == current_user.school_id)
    fees = query.all()
    return {
        "total": len(fees),
        "paid": sum(1 for f in fees if f.status == FeeStatus.PAID),
        "pending": sum(1 for f in fees if f.status == FeeStatus.PENDING),
        "overdue": sum(1 for f in fees if f.status == FeeStatus.OVERDUE),
        "total_amount": sum(f.amount for f in fees),
        "collected": sum(f.paid_amount for f in fees)
    }


@router.get("/defaulter-input")
def defaulter_input_data(
    school_id: Optional[uuid.UUID] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role.value == "super_admin":
        target_school_id = school_id or current_user.school_id
    else:
        target_school_id = current_user.school_id

    if not target_school_id:
        raise HTTPException(status_code=400, detail="No school associated")

    students_query = db.query(Student).filter(
        Student.school_id == target_school_id,
        Student.is_active == True,
    )

    # Teachers should only analyze their assigned classes/sections.
    if current_user.role.value == "teacher":
        teacher = db.query(Teacher).filter(
            Teacher.school_id == target_school_id,
            Teacher.email == current_user.email,
            Teacher.is_active == True,
        ).first()
        if not teacher:
            return {"students": []}

        pairs: set[tuple[str, str]] = set()
        class_sections = db.query(ClassSection).filter(
            ClassSection.school_id == target_school_id,
            ClassSection.class_teacher_id == teacher.id,
            ClassSection.is_active == True,
        ).all()
        taught = db.query(Subject).filter(
            Subject.school_id == target_school_id,
            Subject.teacher_id == teacher.id,
            Subject.is_active == True,
        ).all()
        for cs in class_sections:
            pairs.add((cs.class_name, cs.section))
        for subject in taught:
            if subject.class_name:
                pairs.add((subject.class_name, subject.section or ""))

        all_students = students_query.all()
        scoped_students = []
        for student in all_students:
            for class_name, section in pairs:
                if student.class_name == class_name and (not section or student.section == section):
                    scoped_students.append(student)
                    break
    else:
        # School admin and super admin get all school students.
        scoped_students = students_query.all()

    result = []
    for student in scoped_students:
        fees = db.query(Fee).filter(Fee.student_id == student.id).order_by(Fee.year, Fee.month).all()
        result.append({
            "id": str(student.id),
            "full_name": student.full_name,
            "roll_number": student.roll_number,
            "class_name": student.class_name,
            "section": student.section,
            "fees": [
                {
                    "month": fee.month,
                    "year": fee.year,
                    "amount": fee.amount,
                    "paid_amount": fee.paid_amount,
                    "status": fee.status.value if hasattr(fee.status, "value") else fee.status,
                    "due_date": str(fee.due_date) if fee.due_date else None,
                }
                for fee in fees
            ],
            "total_due": sum(fee.amount - (fee.paid_amount or 0) for fee in fees if fee.status != FeeStatus.PAID),
            "months_overdue": sum(1 for fee in fees if fee.status == FeeStatus.OVERDUE),
        })

    return {"students": result}
