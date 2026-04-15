from fastapi import APIRouter, Depends, HTTPException
from app.models.user import User
from app.api.v1.endpoints.auth import get_current_user
from app.core.config import settings
from pydantic import BaseModel
import httpx
import json

router = APIRouter()

class AIRequest(BaseModel):
    prompt: str
    type: str = "general"  # general | exam | lesson_plan | announcement

SYSTEM_PROMPTS = {
    "exam": "You are an expert Pakistani school teacher. Generate well-structured exam questions in JSON format with fields: question, marks, type (mcq/short/long). Be curriculum-aligned.",
    "lesson_plan": "You are a Pakistani school teacher. Create a detailed lesson plan with: objectives, activities, assessment, and homework. Format clearly.",
    "announcement": "You are a school admin assistant. Write a professional school announcement in both English and Urdu.",
    "general": "You are Nyxion AI, an intelligent assistant for Pakistani schools. Help teachers, admins, and staff with school-related tasks."
}

@router.post("/generate")
async def generate(request: AIRequest, current_user: User = Depends(get_current_user)):
    system_prompt = SYSTEM_PROMPTS.get(request.type, SYSTEM_PROMPTS["general"])

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{settings.OLLAMA_BASE_URL}/api/generate",
                json={
                    "model": settings.OLLAMA_MODEL,
                    "prompt": f"{system_prompt}\n\nUser: {request.prompt}",
                    "stream": False
                }
            )
            result = response.json()
            return {"response": result.get("response", ""), "model": settings.OLLAMA_MODEL}
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"AI service unavailable: {str(e)}")