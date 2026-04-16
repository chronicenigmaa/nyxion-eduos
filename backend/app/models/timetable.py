from sqlalchemy import Column, String, DateTime, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base
import uuid
from datetime import datetime

class TimetableEntry(Base):
    __tablename__ = "timetable"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    school_id = Column(UUID(as_uuid=True), ForeignKey("schools.id"), nullable=False)
    class_name = Column(String(50))
    section = Column(String(10))
    day = Column(String(20))
    period = Column(Integer)
    start_time = Column(String(10))
    end_time = Column(String(10))
    subject_name = Column(String(100))
    teacher_name = Column(String(255))
    room = Column(String(50))
    created_at = Column(DateTime, default=datetime.utcnow)