from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Float, Enum, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base
import uuid
from datetime import datetime
import enum

class FeeStatus(str, enum.Enum):
    PENDING = "pending"
    PAID = "paid"
    OVERDUE = "overdue"
    PARTIAL = "partial"

class Fee(Base):
    __tablename__ = "fees"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    school_id = Column(UUID(as_uuid=True), ForeignKey("schools.id"), nullable=False)
    student_id = Column(UUID(as_uuid=True), ForeignKey("students.id"), nullable=False)
    amount = Column(Float, nullable=False)
    month = Column(String(20))
    year = Column(String(10))
    status = Column(Enum(FeeStatus), default=FeeStatus.PENDING)
    paid_amount = Column(Float, default=0)
    due_date = Column(DateTime)
    paid_date = Column(DateTime)
    remarks = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    student = relationship("Student", backref="fees")