from sqlalchemy import Column, String, Boolean, DateTime, Text, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base
import uuid
from datetime import datetime

DEFAULT_FEATURES = {
    "exam_generator": True,
    "lesson_planner": True,
    "notice_writer": True,
    "attendance_analysis": True,
    "fee_defaulter_prediction": False,
    "report_card_generator": False,
    "homework_generator": False,
    "exam_analyser": False,
    "parent_messages": False,
    "ai_chatbot": False,
    "timetable_generator": False,
    "risk_scoring": False,
    "behaviour_tracker": False,
    "plagiarism_detector": False,
    "student_portal": False,
    "export_pdf": True,
}

PACKAGE_FEATURES = {
    "starter": [
        "exam_generator", "lesson_planner", "notice_writer",
        "attendance_analysis", "export_pdf", "student_portal"
    ],
    "growth": [
        "exam_generator", "lesson_planner", "notice_writer",
        "attendance_analysis", "fee_defaulter_prediction",
        "report_card_generator", "homework_generator",
        "exam_analyser", "parent_messages", "export_pdf", "student_portal"
    ],
    "elite": "all"
}

def get_school_features(school) -> dict:
    package = (school.package or "starter").lower()

    if package == "elite":
        return dict(DEFAULT_FEATURES)

    enabled = PACKAGE_FEATURES.get(package, PACKAGE_FEATURES["starter"])

    features = {key: False for key in DEFAULT_FEATURES.keys()}
    for feature in enabled:
        if feature in features:
            features[feature] = True

    # allow per-school overrides saved in DB
    if school.features:
        features.update(school.features)

    return features

class School(Base):
    __tablename__ = "schools"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    code = Column(String(50), unique=True, nullable=False)
    address = Column(Text)
    phone = Column(String(50))
    email = Column(String(255))
    package = Column(String(20), default="starter")
    features = Column(JSON, default=DEFAULT_FEATURES)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    users = relationship("User", back_populates="school")
    students = relationship("Student", back_populates="school")