from fastapi import APIRouter
from app.api.v1.endpoints import auth, schools, students, ai

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(schools.router, prefix="/schools", tags=["schools"])
api_router.include_router(students.router, prefix="/students", tags=["students"])
api_router.include_router(ai.router, prefix="/ai", tags=["ai"])