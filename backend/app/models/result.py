from sqlalchemy import Column, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base
import uuid
from datetime import datetime

class Result(Base):
    __tablename__ = "results"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    school_id = Column(UUID(as_uuid=True), ForeignKey("schools.id"), nullable=False)
    student_id = Column(UUID(as_uuid=True), ForeignKey("students.id"), nullable=False)
    subject_id = Column(UUID(as_uuid=True), ForeignKey("subjects.id"), nullable=True)
    subject_name = Column(String(100))
    exam_type = Column(String(50))  # midterm, final, quiz, test
    term = Column(String(50))
    class_name = Column(String(50))
    total_marks = Column(Float)
    marks_obtained = Column(Float)
    grade = Column(String(5))
    remarks = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    student = relationship("Student", backref="results")