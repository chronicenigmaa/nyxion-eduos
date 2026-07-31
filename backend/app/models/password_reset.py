from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base
import uuid
from datetime import datetime


class PasswordResetToken(Base):
    """Single-use, time-limited password reset token.

    Only the SHA-256 hash of the token is stored — the raw token exists solely
    in the email that was sent, so a database leak cannot be replayed.
    """

    __tablename__ = "password_reset_tokens"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    token_hash = Column(String(128), unique=True, nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False)
    used_at = Column(DateTime, nullable=True)
    requested_ip = Column(String(64), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    @property
    def is_usable(self) -> bool:
        return self.used_at is None and self.expires_at > datetime.utcnow()
