from fastapi import APIRouter, Depends, HTTPException
from app.models.user import User
from app.api.v1.endpoints.auth import get_current_user
from pydantic import BaseModel
import httpx
import os

router = APIRouter()

class AIRequest(BaseModel):
    prompt: str
    type: str = "general"

SYSTEM_PROMPTS = {
    "exam": "You are an expert Pakistani school teacher. Generate well-structured exam questions with fields: question, marks, type (mcq/short/long).",
    "lesson_plan": "You are a Pakistani school teacher. Create a detailed lesson plan with objectives, activities, assessment, and homework.",
    "announcement": "You are a school admin assistant. Write a professional school announcement in both English and Urdu.",
    "general": "You are Nyxion AI, an intelligent assistant for Pakistani schools."
}

@router.post("/generate")
async def generate(request: AIRequest, current_user: User = Depends(get_current_user)):
    system_prompt = SYSTEM_PROMPTS.get(request.type, SYSTEM_PROMPTS["general"])
    api_key = os.getenv("GEMINI_API_KEY", "")

    if not api_key:
        raise HTTPException(status_code=503, detail="AI service not configured.")

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}",
                headers={"Content-Type": "application/json"},
                json={
                    "contents": [
                        {
                            "parts": [
                                {"text": f"{system_prompt}\n\n{request.prompt}"}
                            ]
                        }
                    ]
                }
            )
            result = response.json()
            text = result["candidates"][0]["content"]["parts"][0]["text"]
            return {
                "response": text,
                "model": "Gemini 1.5 Flash"
            }
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"AI error: {str(e)}")