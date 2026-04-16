from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Text, Enum
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base
import uuid
from datetime import datetime
import enum

class NoticeType(str, enum.Enum):
    GENERAL = "general"
    FEE = "fee"
    EXAM = "exam"
    HOLIDAY = "holiday"
    URGENT = "urgent"

class Notice(Base):
    __tablename__ = "notices"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    school_id = Column(UUID(as_uuid=True), ForeignKey("schools.id"), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    type = Column(Enum(NoticeType), default=NoticeType.GENERAL)
    sent_via_whatsapp = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)