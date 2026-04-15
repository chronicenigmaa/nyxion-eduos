from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Date, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base
import uuid
from datetime import datetime

class Student(Base):
    __tablename__ = "students"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    school_id = Column(UUID(as_uuid=True), ForeignKey("schools.id"), nullable=False)
    roll_number = Column(String(50))
    full_name = Column(String(255), nullable=False)
    father_name = Column(String(255))
    class_name = Column(String(50))
    section = Column(String(10))
    date_of_birth = Column(Date)
    phone = Column(String(50))
    address = Column(Text)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    school = relationship("School", back_populates="students")