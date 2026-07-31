"""Mint a long-lived EduOS API token for another service (e.g. LearnSpace).

Run from the backend/ directory with DATABASE_URL and SECRET_KEY pointing at
the SAME values the deployed EduOS backend uses — a token signed with a
different SECRET_KEY will be rejected.

    python create_service_token.py                       # 365 days, first super admin
    python create_service_token.py --days 90
    python create_service_token.py --email admin@tcs.edu.pk   # scope to one school

Why this exists:
    A token from POST /api/v1/auth/login expires after
    ACCESS_TOKEN_EXPIRE_MINUTES (24h by default), so it cannot be pasted into
    another service's config — the integration would break the next day.
    This mints the same shape of token with a deliberate long expiry.

The output is a bearer credential with admin access to the EduOS API for its
whole lifetime. Treat it like a password: paste it straight into the consuming
service's environment (LearnSpace's EDUOS_SERVICE_TOKEN), never into a repo,
ticket, or chat. To revoke one early, deactivate the account it belongs to or
rotate SECRET_KEY (which invalidates every session).
"""

import argparse
import sys
from datetime import datetime, timedelta

sys.path.append(".")

from jose import jwt
from sqlalchemy import func

from app.core.config import settings
from app.core.database import SessionLocal, get_db_location
from app.models import User  # noqa: F401 — registers every model
from app.models.user import UserRole


def main() -> int:
    parser = argparse.ArgumentParser(description="Mint a long-lived EduOS service token.")
    parser.add_argument("--email", help="Account to issue the token for. Defaults to the oldest super admin.")
    parser.add_argument("--days", type=int, default=365, help="Lifetime in days (default 365).")
    args = parser.parse_args()

    if args.days < 1:
        print("--days must be at least 1", file=sys.stderr)
        return 1

    location = get_db_location()
    print(f"Database: {location['host']}/{location['database']} schema={location['schema']}")

    db = SessionLocal()
    try:
        if args.email:
            user = db.query(User).filter(func.lower(User.email) == args.email.strip().lower()).first()
            if not user:
                print(f"No account found for {args.email}", file=sys.stderr)
                return 1
            if user.role not in (UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN):
                print(
                    f"{user.email} is a {user.role.value}. The token must belong to a super admin or "
                    "school admin — /students/parent-links rejects anything else.",
                    file=sys.stderr,
                )
                return 1
        else:
            user = db.query(User).filter(
                User.role == UserRole.SUPER_ADMIN,
                User.is_active == True,  # noqa: E712
            ).order_by(User.created_at).first()
            if not user:
                print("No active super admin exists. Run create_superadmin.py first.", file=sys.stderr)
                return 1

        if not user.is_active:
            print(f"{user.email} is deactivated; its token would be rejected.", file=sys.stderr)
            return 1

        expires_at = datetime.utcnow() + timedelta(days=args.days)
        # Same claims as create_access_token so get_current_user resolves it
        # identically to a normal login.
        token = jwt.encode(
            {
                "sub": str(user.id),
                "school_id": str(user.school_id) if user.school_id else None,
                "role": user.role.value,
                "exp": expires_at,
            },
            settings.SECRET_KEY,
            algorithm=settings.ALGORITHM,
        )

        scope = "all schools" if user.role == UserRole.SUPER_ADMIN else f"school {user.school_id}"
        print(f"\nAccount: {user.email} ({user.role.value}, {scope})")
        print(f"Expires: {expires_at.isoformat()}Z  ({args.days} days)")
        print("\nEDUOS_SERVICE_TOKEN=" + token)
        print(
            "\nPaste that into LearnSpace's environment. It grants admin API access "
            "until it expires — handle it like a password, and set a calendar "
            "reminder to reissue it before the expiry date."
        )
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
