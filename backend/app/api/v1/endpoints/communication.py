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
    type: Optional[NoticeType] = None
    target_audience: Optional[str] = None


class NoticeUpdate(BaseModel):
    title: Optional[str] = None
    message: Optional[str] = None
    type: Optional[NoticeType] = None
    target_audience: Optional[str] = None


AUDIENCE_TO_TYPE = {
    "all": NoticeType.GENERAL,
    "students": NoticeType.EXAM,
    "parents": NoticeType.FEE,
    "teachers": NoticeType.URGENT,
}

TYPE_TO_AUDIENCE = {
    NoticeType.GENERAL: "all",
    NoticeType.HOLIDAY: "all",
    NoticeType.EXAM: "students",
    NoticeType.FEE: "parents",
    NoticeType.URGENT: "teachers",
}


def _notice_type_from_payload(payload_type: Optional[NoticeType], target_audience: Optional[str]) -> NoticeType:
    if payload_type is not None:
        return payload_type
    audience = (target_audience or "all").strip().lower()
    return AUDIENCE_TO_TYPE.get(audience, NoticeType.GENERAL)


def _serialize_notice(notice: Notice) -> dict:
    notice_type = notice.type.value if hasattr(notice.type, "value") else str(notice.type)
    return {
        "id": str(notice.id),
        "title": notice.title,
        "message": notice.message,
        "type": notice_type,
        "target_audience": TYPE_TO_AUDIENCE.get(notice.type, "all"),
        "sent_via_whatsapp": notice.sent_via_whatsapp,
        "created_at": str(notice.created_at),
    }

@router.get("/notices")
def list_notices(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    notices = db.query(Notice).filter(
        Notice.school_id == current_user.school_id
    ).order_by(Notice.created_at.desc()).all()
    return [_serialize_notice(n) for n in notices]

@router.post("/notices")
def create_notice(data: NoticeCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    notice = Notice(
        school_id=current_user.school_id,
        title=data.title.strip(),
        message=data.message.strip(),
        type=_notice_type_from_payload(data.type, data.target_audience),
    )
    db.add(notice)
    db.commit()
    db.refresh(notice)
    return {"id": str(notice.id), "message": "Notice created", "notice": _serialize_notice(notice)}


@router.put("/notices/{notice_id}")
@router.patch("/notices/{notice_id}")
def update_notice(notice_id: uuid.UUID, data: NoticeUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    notice = db.query(Notice).filter(
        Notice.id == notice_id,
        Notice.school_id == current_user.school_id
    ).first()
    if not notice:
        raise HTTPException(status_code=404, detail="Notice not found")

    if data.title is not None:
        notice.title = data.title.strip()
    if data.message is not None:
        notice.message = data.message.strip()
    if data.type is not None or data.target_audience is not None:
        notice.type = _notice_type_from_payload(data.type, data.target_audience)

    db.commit()
    db.refresh(notice)
    return {"message": "Notice updated", "notice": _serialize_notice(notice)}


@router.delete("/notices/{notice_id}")
def delete_notice(notice_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    notice = db.query(Notice).filter(
        Notice.id == notice_id,
        Notice.school_id == current_user.school_id
    ).first()
    if not notice:
        raise HTTPException(status_code=404, detail="Notice not found")

    db.delete(notice)
    db.commit()
    return {"message": "Notice deleted"}

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
