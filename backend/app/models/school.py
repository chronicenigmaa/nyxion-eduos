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

def get_package_features(package: str | None) -> dict:
    package_name = (package or "starter").lower()
    allowed = PACKAGE_FEATURES.get(package_name, PACKAGE_FEATURES["starter"])
    if allowed == "all":
        return {key: True for key in DEFAULT_FEATURES.keys()}

    features = {key: False for key in DEFAULT_FEATURES.keys()}
    for feature in allowed:
        if feature in features:
            features[feature] = True
    return features

def normalize_feature_overrides(package: str | None, overrides: dict | None) -> dict:
    base = get_package_features(package)
    normalized = {}
    for key, value in (overrides or {}).items():
        if key in base and base[key] != value:
            normalized[key] = value
    return normalized

def get_school_features(school) -> dict:
    features = get_package_features(school.package)
    features.update(normalize_feature_overrides(school.package, school.features))
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
    features = Column(JSON, default=dict)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    users = relationship("User", back_populates="school")
    students = relationship("Student", back_populates="school")
