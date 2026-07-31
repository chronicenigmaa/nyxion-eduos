"""Create, promote, or reset a super admin account.

Run from the backend/ directory with DATABASE_URL pointing at the target
database (Supabase, Railway, or local).

    python create_superadmin.py --email you@example.com --password 'S3cret!' --name "Your Name"

Other modes:
    python create_superadmin.py --list                 # show all super admins
    python create_superadmin.py --email x@y.z --reset-password 'new'   # reset an existing one
    python create_superadmin.py                        # uses SUPER_ADMIN_* env vars

Safe to run repeatedly: an existing account is promoted/re-activated rather
than duplicated, and its password is only touched when you explicitly pass one.
"""

import argparse
import secrets
import sys

sys.path.append(".")

from sqlalchemy import func

from app.core.config import settings
from app.core.database import Base, SessionLocal, engine, ensure_schema_exists, get_db_location
from app.core.security import get_password_hash
from app.models import User  # noqa: F401 — imports every model so create_all sees them
from app.models.user import UserRole

MIN_PASSWORD_LENGTH = 6


def list_super_admins(db) -> None:
    admins = db.query(User).filter(User.role == UserRole.SUPER_ADMIN).order_by(User.created_at).all()
    if not admins:
        print("No super admin accounts exist.")
        return
    print(f"{len(admins)} super admin account(s):")
    for admin in admins:
        state = "active" if admin.is_active else "INACTIVE"
        pending = " (must change password)" if admin.must_change_password else ""
        print(f"  - {admin.email:<40} {admin.full_name:<28} [{state}]{pending}")


def main() -> int:
    parser = argparse.ArgumentParser(description="Create or manage Nyxion EduOS super admins")
    parser.add_argument("--email", default=None, help="super admin email address")
    parser.add_argument("--password", default=None, help="password for a NEW account")
    parser.add_argument("--reset-password", default=None, help="overwrite the password of an EXISTING account")
    parser.add_argument("--name", default=None, help="full name")
    parser.add_argument("--list", action="store_true", help="list existing super admins and exit")
    parser.add_argument("--generate-password", action="store_true", help="generate a strong password and print it")
    parser.add_argument("--no-force-change", action="store_true", help="do not require a password change on first login")
    parser.add_argument("--create-tables", action="store_true", help="create any missing tables first")
    args = parser.parse_args()

    location = get_db_location()
    print(
        f"Database: {location['driver']}://{location['host']}:{location['port']}"
        f"/{location['database']} (schema: {location['schema']})"
    )

    if args.create_tables:
        ensure_schema_exists()
        Base.metadata.create_all(bind=engine)
        print("Tables ensured.")

    db = SessionLocal()
    try:
        if args.list:
            list_super_admins(db)
            return 0

        email = (args.email or settings.SUPER_ADMIN_EMAIL).strip().lower()
        name = args.name or settings.SUPER_ADMIN_NAME

        password = args.reset_password or args.password
        if args.generate_password:
            password = secrets.token_urlsafe(12)

        existing = db.query(User).filter(func.lower(User.email) == email).first()

        if existing:
            existing.role = UserRole.SUPER_ADMIN
            existing.school_id = None
            existing.is_active = True
            if args.name:
                existing.full_name = args.name
            if password:
                if len(password) < MIN_PASSWORD_LENGTH:
                    print(f"Password must be at least {MIN_PASSWORD_LENGTH} characters.", file=sys.stderr)
                    return 1
                existing.hashed_password = get_password_hash(password)
                existing.must_change_password = not args.no_force_change
            db.commit()
            print(f"Updated existing account '{email}' -> super admin (active).")
            if password:
                print(f"  Password set to: {password}")
            else:
                print("  Password left unchanged (pass --reset-password to change it).")
            return 0

        if not password:
            password = settings.SUPER_ADMIN_PASSWORD
            print("No --password given; using SUPER_ADMIN_PASSWORD from the environment.")

        if len(password) < MIN_PASSWORD_LENGTH:
            print(f"Password must be at least {MIN_PASSWORD_LENGTH} characters.", file=sys.stderr)
            return 1

        db.add(User(
            email=email,
            full_name=name,
            hashed_password=get_password_hash(password),
            role=UserRole.SUPER_ADMIN,
            school_id=None,
            is_active=True,
            must_change_password=not args.no_force_change,
        ))
        db.commit()

        print("\nSuper admin created:")
        print(f"  Email:    {email}")
        print(f"  Password: {password}")
        if not args.no_force_change:
            print("  You will be asked to set a new password on first sign-in.")
        return 0
    except Exception as exc:
        db.rollback()
        print(f"Failed: {exc}", file=sys.stderr)
        return 1
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
