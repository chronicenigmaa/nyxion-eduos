from fastapi import APIRouter, Depends, HTTPException
from app.models.user import User
from app.models.school import School, get_school_features
from app.api.v1.endpoints.auth import get_current_user
from app.core.database import get_db
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
import httpx
import os

router = APIRouter()

class AIRequest(BaseModel):
    prompt: str
    type: str = "general"

class ReportCardRequest(BaseModel):
    student_name: str
    class_name: str
    roll_number: str
    subjects: List[dict]
    attendance_rate: float
    teacher_name: Optional[str] = None

class ExamAnalysisRequest(BaseModel):
    subject: str
    class_name: str
    exam_type: str
    results: List[dict]

class DefaulterRequest(BaseModel):
    students: List[dict]

class RiskScoringRequest(BaseModel):
    students: List[dict]

class BehaviourRequest(BaseModel):
    student_name: str
    class_name: str
    incidents: List[str]
    attendance_rate: float
    academic_performance: str

class PlagiarismRequest(BaseModel):
    text: str
    assignment_title: str

class ChatRequest(BaseModel):
    message: str
    school_context: Optional[str] = None

SYSTEM_PROMPTS = {
    "exam": "You are an expert Pakistani school teacher. Generate well-structured exam questions. Format clearly with question numbers, marks, and question types.",
    "lesson_plan": "You are a Pakistani school teacher. Create detailed lesson plans with: Learning Objectives, Materials Needed, Introduction (5 min), Main Activity (30 min), Assessment (5 min), Homework. Format with clear sections.",
    "announcement": "You are a school admin assistant. Write professional school announcements. First write in English, then below write the Urdu translation. Keep both versions concise and formal.",
    "general": "You are Nyxion AI, an intelligent assistant for Pakistani schools. Be helpful, concise, and specific to Pakistani education context.",
    "attendance": "You are a school analytics expert. Analyze attendance data and provide: 1) Summary, 2) At-risk students, 3) Patterns found, 4) Specific recommendations. Be actionable.",
    "finance": "You are a school finance expert. Analyze fee data and provide: 1) Collection summary, 2) Defaulter patterns, 3) Revenue forecast, 4) Recovery recommendations with specific action steps.",
    "academic": "You are a school academic director. Analyze academic data and provide clear insights with specific recommendations for improvement in a Pakistani school context.",
}

TYPE_FEATURE_MAP = {
    "exam": "exam_generator",
    "lesson_plan": "lesson_planner",
    "announcement": "notice_writer",
}

async def call_ai(system: str, prompt: str, max_tokens: int = 2048) -> str:
    api_key = os.getenv("GROQ_API_KEY", "")
    if not api_key:
        raise HTTPException(status_code=503, detail="AI service not configured. Set GROQ_API_KEY in Railway.")
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                json={
                    "model": "llama-3.3-70b-versatile",
                    "messages": [
                        {"role": "system", "content": system},
                        {"role": "user", "content": prompt}
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

def check_feature(school: Optional[School], feature: str) -> bool:
    if not school:
        return True
    features = get_school_features(school)
    return features.get(feature, False)


def require_feature_for_type(db: Session, current_user: User, request_type: str):
    feature = TYPE_FEATURE_MAP.get(request_type)
    if not feature or not current_user.school_id:
        return
    school = db.query(School).filter(School.id == current_user.school_id).first()
    if school and not check_feature(school, feature):
        raise HTTPException(status_code=403, detail=f"{feature.replace('_', ' ')} is disabled for your school")

@router.post("/generate")
async def generate(request: AIRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    require_feature_for_type(db, current_user, request.type)
    system = SYSTEM_PROMPTS.get(request.type, SYSTEM_PROMPTS["general"])
    response = await call_ai(system, request.prompt)
    return {"response": response, "model": "Llama 3.3 70B"}

@router.post("/analyze")
async def analyze(request: AIRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    system = SYSTEM_PROMPTS.get(request.type, SYSTEM_PROMPTS["general"])
    response = await call_ai(system, request.prompt, max_tokens=2048)
    return {"response": response, "model": "Llama 3.3 70B"}

@router.post("/report-card")
async def report_card(request: ReportCardRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    school = db.query(School).filter(School.id == current_user.school_id).first() if current_user.school_id else None
    if school and not check_feature(school, "report_card_generator"):
        raise HTTPException(status_code=403, detail="Report card generator not available in your package")
    subjects_text = "\n".join([f"- {s['subject']}: {s['marks_obtained']}/{s['total_marks']} (Grade: {s.get('grade','?')})" for s in request.subjects])
    total = sum(s['marks_obtained'] for s in request.subjects)
    total_max = sum(s['total_marks'] for s in request.subjects)
    pct = round((total/total_max)*100, 1) if total_max > 0 else 0
    prompt = f"""Generate a complete student report card for:
Student: {request.student_name}
Class: {request.class_name}
Roll Number: {request.roll_number}
Attendance Rate: {request.attendance_rate}%
Overall: {total}/{total_max} ({pct}%)

Subject Results:
{subjects_text}

Write: 1) Overall Performance Summary (2 sentences), 2) Subject-by-subject remarks (1 sentence each), 3) Strengths (2 points), 4) Areas for Improvement (2 points), 5) Teacher's Final Remarks (3 sentences encouraging and honest). Keep it professional for Pakistani parents."""
    response = await call_ai("You are an experienced Pakistani school teacher writing formal report card remarks. Be honest, encouraging, and specific.", prompt, 1500)
    return {"response": response, "student_name": request.student_name, "percentage": pct, "grade": "A+" if pct >= 90 else "A" if pct >= 80 else "B" if pct >= 70 else "C" if pct >= 60 else "D" if pct >= 50 else "F"}

@router.post("/exam-analysis")
async def exam_analysis(request: ExamAnalysisRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    school = db.query(School).filter(School.id == current_user.school_id).first() if current_user.school_id else None
    if school and not check_feature(school, "exam_analyser"):
        raise HTTPException(status_code=403, detail="Not available in your package")
    percentages = [(r['marks_obtained']/r['total_marks'])*100 for r in request.results if r['total_marks'] > 0]
    avg = round(sum(percentages)/len(percentages), 1) if percentages else 0
    failed = [r['student_name'] for r in request.results if (r['marks_obtained']/r['total_marks'])*100 < 50]
    top = sorted(request.results, key=lambda x: x['marks_obtained']/x['total_marks'], reverse=True)[:3]
    prompt = f"""Analyze {request.exam_type} exam results for Class {request.class_name}, Subject: {request.subject}.
Class average: {avg}%. Total students: {len(request.results)}.
Failed students ({len(failed)}): {', '.join(failed[:5]) or 'none'}.
Top performers: {', '.join([r['student_name'] for r in top])}.
Full results: {[{'name': r['student_name'], 'pct': round((r['marks_obtained']/r['total_marks'])*100,1)} for r in request.results]}

Provide: 1) Class performance summary, 2) Students needing immediate help, 3) Topic areas likely causing failure, 4) Specific teaching interventions, 5) Recommendations for next exam preparation."""
    response = await call_ai("You are a Pakistani school academic analyst. Provide actionable insights for teachers.", prompt, 2000)
    return {"response": response, "average": avg, "pass_rate": round((len(percentages)-len(failed))/len(percentages)*100,1) if percentages else 0, "failed_count": len(failed)}

@router.post("/fee-defaulter-prediction")
async def fee_defaulter_prediction(request: DefaulterRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    school = db.query(School).filter(School.id == current_user.school_id).first() if current_user.school_id else None
    if school and not check_feature(school, "fee_defaulter_prediction"):
        raise HTTPException(status_code=403, detail="Not available in your package")
    prompt = f"""Analyze fee payment patterns and predict defaulters for next month.
Student fee history: {request.students}
For each student with concerning patterns, calculate a risk score (High/Medium/Low) based on:
- Payment history (late payments, missed payments)
- Pattern consistency
- Amount owed
List: 1) High risk students (likely to default next month), 2) Medium risk students, 3) Recommended actions for each group, 4) Overall collection forecast."""
    response = await call_ai("You are a school finance AI. Analyze payment patterns and predict defaults accurately.", prompt, 1500)
    return {"response": response}

@router.post("/risk-scoring")
async def risk_scoring(request: RiskScoringRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    school = db.query(School).filter(School.id == current_user.school_id).first() if current_user.school_id else None
    if school and not check_feature(school, "risk_scoring"):
        raise HTTPException(status_code=403, detail="Not available in your package")
    prompt = f"""Analyze student risk factors and provide dropout/failure risk scores.
Student data: {request.students}
For each student analyze: attendance rate, fee payment status, academic performance.
Output a risk assessment: 1) HIGH RISK students (need immediate intervention), 2) MEDIUM RISK students (need monitoring), 3) LOW RISK students, 4) Specific intervention recommendations for high-risk students."""
    response = await call_ai("You are a student welfare AI for Pakistani schools. Identify at-risk students accurately.", prompt, 2000)
    return {"response": response}

@router.post("/behaviour-analysis")
async def behaviour_analysis(request: BehaviourRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    school = db.query(School).filter(School.id == current_user.school_id).first() if current_user.school_id else None
    if school and not check_feature(school, "behaviour_tracker"):
        raise HTTPException(status_code=403, detail="Not available in your package")
    prompt = f"""Analyze student behaviour and recommend interventions.
Student: {request.student_name}, Class: {request.class_name}
Attendance: {request.attendance_rate}%, Academic Performance: {request.academic_performance}
Behaviour incidents: {', '.join(request.incidents) if request.incidents else 'None recorded'}
Provide: 1) Behaviour pattern analysis, 2) Root cause assessment, 3) Specific intervention plan, 4) Parent communication strategy, 5) Follow-up timeline."""
    response = await call_ai("You are a school counselor AI. Provide compassionate, practical behaviour intervention strategies.", prompt, 1500)
    return {"response": response}

@router.post("/plagiarism-check")
async def plagiarism_check(request: PlagiarismRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    school = db.query(School).filter(School.id == current_user.school_id).first() if current_user.school_id else None
    if school and not check_feature(school, "plagiarism_detector"):
        raise HTTPException(status_code=403, detail="Not available in your package")
    word_count = len(request.text.split())
    prompt = f"""Analyze this student submission for potential plagiarism and AI-generated content.
Assignment: {request.assignment_title}
Word count: {word_count}
Text: {request.text[:2000]}

Analyze: 1) Writing style consistency (does it sound like a student?), 2) Vocabulary sophistication (age-appropriate?), 3) Structural patterns suggesting copy-paste, 4) Signs of AI generation, 5) Overall plagiarism risk: LOW/MEDIUM/HIGH with reasoning, 6) Recommendation for teacher."""
    response = await call_ai("You are a plagiarism detection expert for Pakistani schools. Be thorough but fair.", prompt, 1200)
    return {"response": response, "word_count": word_count}

@router.post("/chatbot")
async def chatbot(request: ChatRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    school = db.query(School).filter(School.id == current_user.school_id).first() if current_user.school_id else None
    if school and not check_feature(school, "ai_chatbot"):
        raise HTTPException(status_code=403, detail="Not available in your package")
    context = request.school_context or ""
    system = f"""You are the Nyxion AI assistant for a Pakistani school. You help teachers and administrators answer questions about their school data, teaching strategies, and administrative tasks.
School context: {context}
Be helpful, concise, and specific. If asked about student data you don't have, say so clearly."""
    response = await call_ai(system, request.message, 1000)
    return {"response": response}

@router.post("/homework-generator")
async def homework_generator(db: Session = Depends(get_db), current_user: User = Depends(get_current_user),
    subject: str = "", class_name: str = "", topic: str = "", difficulty: str = "medium", num_questions: int = 5):
    school = db.query(School).filter(School.id == current_user.school_id).first() if current_user.school_id else None
    if school and not check_feature(school, "homework_generator"):
        raise HTTPException(status_code=403, detail="Not available in your package")
    prompt = f"""Generate {num_questions} homework questions for:
Subject: {subject}, Class: {class_name}, Topic: {topic}, Difficulty: {difficulty}
Mix question types: MCQ, short answer, and one application question.
Format clearly with question numbers. Include an answer key at the end."""
    response = await call_ai(SYSTEM_PROMPTS["exam"], prompt)
    return {"response": response}
