from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Float, Boolean, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base
import uuid
from datetime import datetime
import enum

class AssignmentStatus(str, enum.Enum):
    DRAFT = "draft"
    PUBLISHED = "published"
    CLOSED = "closed"

class Assignment(Base):
    __tablename__ = "assignments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    school_id = Column(UUID(as_uuid=True), ForeignKey("schools.id"), nullable=False)
    teacher_id = Column(UUID(as_uuid=True), ForeignKey("teachers.id"), nullable=True)
    subject_id = Column(UUID(as_uuid=True), ForeignKey("subjects.id"), nullable=True)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    class_name = Column(String(50))
    section = Column(String(10))
    total_marks = Column(Float, default=100)
    due_date = Column(DateTime)
    status = Column(Enum(AssignmentStatus), default=AssignmentStatus.PUBLISHED)
    allow_late = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    submissions = relationship("Submission", back_populates="assignment")
    teacher = relationship("Teacher", backref="assignments")
    