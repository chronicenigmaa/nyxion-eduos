from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.subject import Subject
from app.models.student import Student
from app.models.class_section import ClassSection
from app.models.teacher import Teacher
from app.models.user import User
from app.api.v1.endpoints.auth import get_current_user
from pydantic import BaseModel
from typing import Optional
import uuid

router = APIRouter()


class SubjectCreate(BaseModel):
    name: str
    school_id: Optional[uuid.UUID] = None
    class_name: Optional[str] = None
    section: Optional[str] = None
    teacher_id: Optional[uuid.UUID] = None
    description: Optional[str] = None


class SectionCreate(BaseModel):
    school_id: Optional[uuid.UUID] = None
    class_name: str
    section: str


class SectionUpdate(BaseModel):
    class_teacher_id: Optional[uuid.UUID] = None


class SubjectUpdate(BaseModel):
    teacher_id: Optional[uuid.UUID] = None


def _for_school(query, current_user: User, model):
    if current_user.role.value == "super_admin":
        return query
    return query.filter(model.school_id == current_user.school_id)


@router.get("/subjects")
def list_subjects(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    query = db.query(Subject, Teacher).outerjoin(Teacher, Subject.teacher_id == Teacher.id).filter(Subject.is_active == True)
    if current_user.role.value != "super_admin":
        query = query.filter(Subject.school_id == current_user.school_id)

    rows = query.order_by(Subject.class_name.asc().nulls_last(), Subject.section.asc().nulls_last(), Subject.name.asc()).all()
    return [
        {
            "id": str(subject.id),
            "name": subject.name,
            "class_name": subject.class_name,
            "section": subject.section,
            "description": subject.description,
            "teacher_id": str(subject.teacher_id) if subject.teacher_id else None,
            "teacher_name": teacher.full_name if teacher else None,
        }
        for subject, teacher in rows
    ]


@router.post("/subjects")
def create_subject(data: SubjectCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role.value == "super_admin":
        target_school_id = data.school_id or current_user.school_id
    else:
        target_school_id = current_user.school_id

    if not target_school_id:
        raise HTTPException(status_code=400, detail="Select a school before creating a subject")

    class_name = data.class_name.strip() if data.class_name else None
    section = data.section.strip().upper() if data.section else None

    if data.teacher_id:
        teacher = db.query(Teacher).filter(
            Teacher.id == data.teacher_id,
            Teacher.school_id == target_school_id,
            Teacher.is_active == True,
        ).first()
        if not teacher:
            raise HTTPException(status_code=404, detail="Teacher not found in your school")

    subject = Subject(
        name=data.name.strip(),
        class_name=class_name,
        section=section,
        teacher_id=data.teacher_id,
        description=data.description,
        school_id=target_school_id,
    )
    db.add(subject)

    if class_name and section:
        existing_section = db.query(ClassSection).filter(
            ClassSection.school_id == target_school_id,
            ClassSection.class_name == class_name,
            ClassSection.section == section,
            ClassSection.is_active == True,
        ).first()
        if not existing_section:
            db.add(ClassSection(school_id=target_school_id, class_name=class_name, section=section))

    db.commit()
    db.refresh(subject)

    teacher_name = None
    if subject.teacher_id:
        teacher = db.query(Teacher).filter(Teacher.id == subject.teacher_id).first()
        teacher_name = teacher.full_name if teacher else None

    return {
        "id": str(subject.id),
        "name": subject.name,
        "class_name": subject.class_name,
        "section": subject.section,
        "description": subject.description,
        "teacher_id": str(subject.teacher_id) if subject.teacher_id else None,
        "teacher_name": teacher_name,
    }


@router.get("/sections")
def list_sections(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    query = db.query(ClassSection, Teacher).outerjoin(Teacher, ClassSection.class_teacher_id == Teacher.id).filter(ClassSection.is_active == True)
    query = _for_school(query, current_user, ClassSection)
    rows = query.order_by(ClassSection.class_name.asc(), ClassSection.section.asc()).all()

    return [
        {
            "id": str(cs.id),
            "class_name": cs.class_name,
            "section": cs.section,
            "class_teacher_id": str(cs.class_teacher_id) if cs.class_teacher_id else None,
            "class_teacher_name": t.full_name if t else None,
        }
        for cs, t in rows
    ]


@router.patch("/sections/{section_id}")
def update_section(
    section_id: uuid.UUID,
    data: SectionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(ClassSection).filter(ClassSection.id == section_id, ClassSection.is_active == True)
    if current_user.role.value != "super_admin":
        query = query.filter(ClassSection.school_id == current_user.school_id)
    cs = query.first()
    if not cs:
        raise HTTPException(status_code=404, detail="Section not found")

    if data.class_teacher_id is not None:
        if data.class_teacher_id == uuid.UUID("00000000-0000-0000-0000-000000000000"):
            cs.class_teacher_id = None
        else:
            teacher = db.query(Teacher).filter(Teacher.id == data.class_teacher_id, Teacher.school_id == cs.school_id, Teacher.is_active == True).first()
            if not teacher:
                raise HTTPException(status_code=404, detail="Teacher not found")
            cs.class_teacher_id = data.class_teacher_id
    else:
        cs.class_teacher_id = None

    db.commit()
    db.refresh(cs)
    t = db.query(Teacher).filter(Teacher.id == cs.class_teacher_id).first() if cs.class_teacher_id else None
    return {
        "id": str(cs.id),
        "class_name": cs.class_name,
        "section": cs.section,
        "class_teacher_id": str(cs.class_teacher_id) if cs.class_teacher_id else None,
        "class_teacher_name": t.full_name if t else None,
    }


@router.patch("/subjects/{subject_id}")
def update_subject(
    subject_id: uuid.UUID,
    data: SubjectUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Subject).filter(Subject.id == subject_id, Subject.is_active == True)
    if current_user.role.value != "super_admin":
        query = query.filter(Subject.school_id == current_user.school_id)
    subject = query.first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    if data.teacher_id is not None:
        if data.teacher_id == uuid.UUID("00000000-0000-0000-0000-000000000000"):
            subject.teacher_id = None
        else:
            teacher = db.query(Teacher).filter(Teacher.id == data.teacher_id, Teacher.school_id == subject.school_id, Teacher.is_active == True).first()
            if not teacher:
                raise HTTPException(status_code=404, detail="Teacher not found")
            subject.teacher_id = data.teacher_id
    else:
        subject.teacher_id = None

    db.commit()
    db.refresh(subject)
    t = db.query(Teacher).filter(Teacher.id == subject.teacher_id).first() if subject.teacher_id else None
    return {
        "id": str(subject.id),
        "name": subject.name,
        "class_name": subject.class_name,
        "section": subject.section,
        "teacher_id": str(subject.teacher_id) if subject.teacher_id else None,
        "teacher_name": t.full_name if t else None,
    }


@router.post("/sections")
def create_section(data: SectionCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role.value == "super_admin":
        target_school_id = data.school_id or current_user.school_id
    else:
        target_school_id = current_user.school_id
    if not target_school_id:
        raise HTTPException(status_code=400, detail="Select a school before creating a section")

    class_name = data.class_name.strip()
    section = data.section.strip().upper()

    if not class_name or not section:
        raise HTTPException(status_code=400, detail="Class and section are required")

    existing = db.query(ClassSection).filter(
        ClassSection.school_id == target_school_id,
        ClassSection.class_name == class_name,
        ClassSection.section == section,
        ClassSection.is_active == True,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="This section already exists for the class")

    record = ClassSection(
        school_id=target_school_id,
        class_name=class_name,
        section=section,
        is_active=True,
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    return {
        "id": str(record.id),
        "class_name": record.class_name,
        "section": record.section,
    }


@router.get("/classes")
def list_classes(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    students_query = db.query(Student.class_name, Student.section).filter(Student.is_active == True)
    sections_query = db.query(ClassSection.class_name, ClassSection.section).filter(ClassSection.is_active == True)

    if current_user.role.value != "super_admin":
        students_query = students_query.filter(Student.school_id == current_user.school_id)
        sections_query = sections_query.filter(ClassSection.school_id == current_user.school_id)

    classes: dict[str, set[str]] = {}

    for class_name, section in students_query.distinct().all():
        if not class_name:
            continue
        classes.setdefault(class_name, set())
        if section:
            classes[class_name].add(section)

    for class_name, section in sections_query.distinct().all():
        if not class_name:
            continue
        classes.setdefault(class_name, set())
        if section:
            classes[class_name].add(section)

    return [
        {"class_name": class_name, "sections": sorted(list(sections))}
        for class_name, sections in sorted(classes.items(), key=lambda row: row[0])
    ]
