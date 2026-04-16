from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.notice import Notice, NoticeType
from app.models.user import User
from app.api.v1.endpoints.auth import get_current_user
from pydantic import BaseModel
from typing import Optional
import uuid

router = APIRouter()

class NoticeCreate(BaseModel):
    title: str
    message: str
    type: NoticeType = NoticeType.GENERAL

@router.get("/notices")
def list_notices(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    notices = db.query(Notice).filter(
        Notice.school_id == current_user.school_id
    ).order_by(Notice.created_at.desc()).all()
    return [
        {
            "id": str(n.id),
            "title": n.title,
            "message": n.message,
            "type": n.type,
            "sent_via_whatsapp": n.sent_via_whatsapp,
            "created_at": str(n.created_at)
        }
        for n in notices
    ]

@router.post("/notices")
def create_notice(data: NoticeCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    notice = Notice(**data.dict(), school_id=current_user.school_id)
    db.add(notice)
    db.commit()
    db.refresh(notice)
    return {"id": str(notice.id), "message": "Notice created"}

@router.post("/notices/{notice_id}/send-whatsapp")
def send_whatsapp(notice_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    notice = db.query(Notice).filter(
        Notice.id == notice_id,
        Notice.school_id == current_user.school_id
    ).first()
    if not notice:
        raise HTTPException(status_code=404, detail="Notice not found")
    notice.sent_via_whatsapp = True
    db.commit()
    return {"message": "Sent"}