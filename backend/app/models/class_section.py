from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base
import uuid
from datetime import datetime


class ClassSection(Base):
    __tablename__ = "class_sections"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    school_id = Column(UUID(as_uuid=True), ForeignKey("schools.id"), nullable=False)
    class_name = Column(String(50), nullable=False)
    section = Column(String(20), nullable=False)
    class_teacher_id = Column(UUID(as_uuid=True), ForeignKey("teachers.id"), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    class_teacher = relationship("Teacher", foreign_keys=[class_teacher_id])
