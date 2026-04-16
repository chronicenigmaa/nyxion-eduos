from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Float, Boolean, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base
import uuid
from datetime import datetime
import enum

class SubmissionStatus(str, enum.Enum):
    SUBMITTED = "submitted"
    GRADED = "graded"
    LATE = "late"
    MISSING = "missing"

class Submission(Base):
    __tablename__ = "submissions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    school_id = Column(UUID(as_uuid=True), ForeignKey("schools.id"), nullable=False)
    assignment_id = Column(UUID(as_uuid=True), ForeignKey("assignments.id"), nullable=False)
    student_id = Column(UUID(as_uuid=True), ForeignKey("students.id"), nullable=False)
    content = Column(Text)
    file_url = Column(String(500))
    marks_obtained = Column(Float)
    feedback = Column(Text)
    status = Column(Enum(SubmissionStatus), default=SubmissionStatus.SUBMITTED)
    submitted_at = Column(DateTime, default=datetime.utcnow)
    graded_at = Column(DateTime)

    assignment = relationship("Assignment", back_populates="submissions")
    student = relationship("Student", backref="submissions")