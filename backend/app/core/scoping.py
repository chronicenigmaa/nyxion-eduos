"""Shared school-scoping rules for API endpoints.

A super admin is global: `users.school_id` is NULL for them (see
ensure_super_admin in main.py, which deliberately nulls it). Filtering a query
by `current_user.school_id` therefore matches NOTHING for a super admin, so
endpoints that scope that way silently return empty lists to the one account
that is supposed to see everything.
"""

from fastapi import HTTPException

from app.models.user import User, UserRole


def is_super_admin(current_user: User) -> bool:
    return current_user.role == UserRole.SUPER_ADMIN


def apply_school_scope(query, column, current_user: User):
    """Restrict `query` to the caller's school.

    Super admins are unrestricted and see every school. Anyone else must have
    a school, otherwise the request is a configuration error rather than an
    empty result.
    """
    if is_super_admin(current_user):
        return query
    if not current_user.school_id:
        raise HTTPException(status_code=400, detail="No school associated")
    return query.filter(column == current_user.school_id)


def school_id_for_record(record_school_id, current_user: User):
    """Resolve the school a write belongs to, and authorise it.

    Writes cannot use `current_user.school_id` blindly: it is NULL for a super
    admin, which would break a NOT NULL column. Deriving it from the record
    being written also stops a school admin writing into another school.
    """
    if record_school_id is None:
        raise HTTPException(status_code=400, detail="Record has no school")
    if is_super_admin(current_user):
        return record_school_id
    if not current_user.school_id:
        raise HTTPException(status_code=400, detail="No school associated")
    if record_school_id != current_user.school_id:
        raise HTTPException(status_code=403, detail="That record belongs to another school")
    return record_school_id
