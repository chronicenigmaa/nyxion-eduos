from sqlalchemy import Column, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base
import uuid
from datetime import datetime


class StudentParent(Base):
    """Links a parent user account to a student.

    Many-to-many on purpose: one parent account covers several siblings, and a
    student can have both guardians on separate logins. This mirrors the shape
    of LearnSpace's `parent_children` table so the two products model the
    relationship the same way and the link can be synced between them.
    """

    __tablename__ = "student_parents"
    __table_args__ = (
        UniqueConstraint("parent_user_id", "student_id", name="uq_student_parent"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    parent_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    student_id = Column(UUID(as_uuid=True), ForeignKey("students.id"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
