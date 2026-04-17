from fastapi import APIRouter, Depends, HTTPException
from app.models.user import User
from app.api.v1.endpoints.auth import get_current_user
from app.core.database import get_db
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
import httpx
import os

router = APIRouter()

class AIRequest(BaseModel):
    prompt: str
    type: str = "general"

SYSTEM_PROMPTS = {
    "exam":         "You are an expert Pakistani school teacher. Generate well-structured exam questions with clear marks allocation.",
    "lesson_plan":  "You are a Pakistani school teacher. Create detailed lesson plans with objectives, activities, and homework.",
    "announcement": "You are a school admin. Write professional school announcements in English and Urdu.",
    "general":      "You are Nyxion AI, an intelligent assistant for Pakistani schools.",
    "attendance":   "You are a school analytics AI. Analyze attendance data and provide actionable insights.",
    "finance":      "You are a school finance AI. Analyze fee collection data and provide recommendations.",
    "academic":     "You are a school academic AI. Analyze academic data and provide curriculum recommendations.",
}

async def call_ai(system: str, prompt: str, max_tokens: int = 2048) -> str:
    api_key = os.getenv("GROQ_API_KEY", "")

    if not api_key:
        raise HTTPException(status_code=503, detail="AI service not configured. Set GROQ_API_KEY.")

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "llama3-70b-8192",
                    "messages": [
                        {"role": "system", "content": system},
                        {"role": "user",   "content": prompt}
                    ],
                    "max_tokens": max_tokens,
                    "temperature": 0.7
                }
            )
            result = response.json()
            if "choices" not in result:
                raise HTTPException(status_code=503, detail=f"AI error: {result}")
            return result["choices"][0]["message"]["content"]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"AI error: {str(e)}")


@router.post("/generate")
async def generate(request: AIRequest, current_user: User = Depends(get_current_user)):
    system = SYSTEM_PROMPTS.get(request.type, SYSTEM_PROMPTS["general"])
    response = await call_ai(system, request.prompt)
    return {"response": response, "model": "Llama 3 70B (Groq)"}


@router.post("/analyze")
async def analyze(request: AIRequest, current_user: User = Depends(get_current_user)):
    system = SYSTEM_PROMPTS.get(request.type, SYSTEM_PROMPTS["general"])
    response = await call_ai(system, request.prompt, max_tokens=2048)
    return {"response": response, "model": "Llama 3 70B (Groq)"}