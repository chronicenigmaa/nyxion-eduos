from fastapi import APIRouter
from app.api.v1.endpoints import (
    auth, schools, students, ai, teachers,
    attendance, fees, academics, communication,
    assignments, results, coursebooks, timetable
)

api_router = APIRouter()
api_router.include_router(auth.router,          prefix="/auth",          tags=["auth"])
api_router.include_router(schools.router,       prefix="/schools",       tags=["schools"])
api_router.include_router(students.router,      prefix="/students",      tags=["students"])
api_router.include_router(teachers.router,      prefix="/teachers",      tags=["teachers"])
api_router.include_router(attendance.router,    prefix="/attendance",    tags=["attendance"])
api_router.include_router(fees.router,          prefix="/fees",          tags=["fees"])
api_router.include_router(academics.router,     prefix="/academics",     tags=["academics"])
api_router.include_router(communication.router, prefix="/communication", tags=["communication"])
api_router.include_router(assignments.router,   prefix="/assignments",   tags=["assignments"])
api_router.include_router(results.router,       prefix="/results",       tags=["results"])
api_router.include_router(coursebooks.router,   prefix="/coursebooks",   tags=["coursebooks"])
api_router.include_router(timetable.router,     prefix="/timetable",     tags=["timetable"])
api_router.include_router(ai.router,            prefix="/ai",            tags=["ai"])