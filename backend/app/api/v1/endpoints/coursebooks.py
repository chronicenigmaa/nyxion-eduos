from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.coursebook import CourseBook
from app.models.user import User
from app.api.v1.endpoints.auth import get_current_user
from pydantic import BaseModel
from typing import Optional, List
import uuid

router = APIRouter()

class CourseBookCreate(BaseModel):
    title: str
    description: Optional[str] = None
    class_name: Optional[str] = None
    file_url: Optional[str] = None
    file_type: Optional[str] = None

@router.get("/")
def list_books(class_name: Optional[str] = None,
               db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    q = db.query(CourseBook).filter(
        CourseBook.school_id == current_user.school_id,
        CourseBook.is_active == True
    )
    if class_name:
        q = q.filter(CourseBook.class_name == class_name)
    books = q.all()
    return [
        {
            "id": str(b.id),
            "title": b.title,
            "description": b.description,
            "class_name": b.class_name,
            "file_url": b.file_url,
            "file_type": b.file_type,
            "created_at": str(b.created_at)
        }
        for b in books
    ]

@router.post("/")
def upload_book(data: CourseBookCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    book = CourseBook(
        **data.dict(),
        school_id=current_user.school_id,
        uploaded_by=current_user.id
    )
    db.add(book)
    db.commit()
    db.refresh(book)
    return {"id": str(book.id), "message": "Book added"}

@router.delete("/{book_id}")
def delete_book(book_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    book = db.query(CourseBook).filter(
        CourseBook.id == book_id,
        CourseBook.school_id == current_user.school_id
    ).first()
    if not book:
        raise HTTPException(status_code=404, detail="Not found")
    book.is_active = False
    db.commit()
    return {"message": "Deleted"}