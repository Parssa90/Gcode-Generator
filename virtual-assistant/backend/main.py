import os
import json
import asyncio
import logging
from datetime import datetime
from typing import Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from config import settings
from database.db import init_db, get_db, ConversationLog, TaskDB, DocumentDB, MeetingDB, get_id
from core.ai_engine import chat, generate_document, generate_monthly_report, analyze_emails
from core.websocket_manager import client_manager, laptop_bridge
from core.email_manager import send_email as outlook_send, fetch_inbox, fetch_email_body, is_configured as email_configured

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("aria")

os.makedirs(settings.uploads_dir, exist_ok=True)
os.makedirs(settings.logs_dir, exist_ok=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    logger.info("ARIA backend started")
    asyncio.create_task(try_connect_laptop())
    yield
    logger.info("ARIA backend stopped")


async def try_connect_laptop():
    await asyncio.sleep(3)
    await laptop_bridge.connect(settings.laptop_agent_url)


app = FastAPI(title="ARIA Backend", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Models ───────────────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    message: str
    conversationId: Optional[str] = None
    context: Optional[dict] = None
    isVoice: bool = False


class MeetingCreate(BaseModel):
    title: str
    startTime: str
    endTime: str
    attendees: list[str] = []
    location: Optional[str] = None
    description: Optional[str] = None


class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    priority: str = "medium"
    status: str = "pending"
    dueDate: Optional[str] = None
    laptopSync: bool = False


class DocumentGenerate(BaseModel):
    type: str
    title: str
    context: str
    recipient: Optional[str] = None


class FileReadRequest(BaseModel):
    path: str


class FileWriteRequest(BaseModel):
    path: str
    content: str


class FileDirRequest(BaseModel):
    dir: str


# ─── Chat ─────────────────────────────────────────────────────────────────────

@app.post("/api/chat")
async def api_chat(req: ChatRequest, db: Session = Depends(get_db)):
    conversation_id = req.conversationId or get_id()

    history = (
        db.query(ConversationLog)
        .filter(ConversationLog.conversation_id == conversation_id)
        .order_by(ConversationLog.created_at)
        .limit(20)
        .all()
    )
    history_msgs = [{"role": h.role, "content": h.content} for h in history]

    reply, action = await chat(req.message, history_msgs, req.context)

    db.add(ConversationLog(
        conversation_id=conversation_id,
        role="user",
        content=req.message,
        is_voice=req.isVoice,
    ))
    db.add(ConversationLog(
        conversation_id=conversation_id,
        role="assistant",
        content=reply,
    ))
    db.commit()

    _save_log(conversation_id, req.message, reply)

    return {"reply": reply, "conversationId": conversation_id, "action": action}


def _save_log(conv_id: str, user_msg: str, assistant_msg: str):
    """Save conversation to local log file for laptop sync."""
    log_file = os.path.join(settings.logs_dir, f"conv_{conv_id[:8]}.jsonl")
    with open(log_file, "a") as f:
        f.write(json.dumps({
            "timestamp": datetime.utcnow().isoformat(),
            "user": user_msg,
            "assistant": assistant_msg,
        }) + "\n")


# ─── Voice ────────────────────────────────────────────────────────────────────

@app.post("/api/voice/transcribe")
async def api_transcribe(audio: UploadFile = File(...)):
    """Transcribe audio using OpenAI Whisper or return mock."""
    content = await audio.read()
    if len(content) < 1000:
        return {"text": ""}

    try:
        import openai
        oai = openai.OpenAI()
        import tempfile
        with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as tmp:
            tmp.write(content)
            tmp_path = tmp.name
        with open(tmp_path, "rb") as f:
            result = oai.audio.transcriptions.create(model="whisper-1", file=f)
        os.unlink(tmp_path)
        return {"text": result.text}
    except Exception:
        return {"text": "[Voice transcription requires OpenAI API key in .env]"}


# ─── Calendar ─────────────────────────────────────────────────────────────────

@app.get("/api/calendar/meetings")
async def get_meetings(db: Session = Depends(get_db)):
    meetings = db.query(MeetingDB).order_by(MeetingDB.start_time).all()
    return [
        {
            "id": m.id,
            "title": m.title,
            "startTime": m.start_time.isoformat(),
            "endTime": m.end_time.isoformat(),
            "attendees": m.attendees,
            "location": m.location,
            "description": m.description,
            "status": m.status,
        }
        for m in meetings
    ]


@app.post("/api/calendar/meetings")
async def create_meeting(req: MeetingCreate, db: Session = Depends(get_db)):
    meeting = MeetingDB(
        title=req.title,
        start_time=datetime.fromisoformat(req.startTime.replace("Z", "+00:00")),
        end_time=datetime.fromisoformat(req.endTime.replace("Z", "+00:00")),
        attendees=req.attendees,
        location=req.location,
        description=req.description,
    )
    db.add(meeting)
    db.commit()
    db.refresh(meeting)
    await laptop_bridge.send("new_meeting", {"title": req.title, "startTime": req.startTime})
    return {
        "id": meeting.id,
        "title": meeting.title,
        "startTime": meeting.start_time.isoformat(),
        "endTime": meeting.end_time.isoformat(),
        "attendees": meeting.attendees,
        "status": meeting.status,
    }


# ─── Email (Outlook / Office 365) ────────────────────────────────────────────

class EmailSendRequest(BaseModel):
    to: list[str]
    subject: str
    body: str
    cc: list[str] = []
    html: bool = False


@app.get("/api/email/status")
async def email_status():
    """Returns whether Outlook credentials are configured."""
    return {
        "configured": email_configured(),
        "account": settings.outlook_email if email_configured() else None,
    }


@app.get("/api/email/list")
async def list_emails(folder: str = "INBOX", limit: int = 20):
    """Fetch real emails from Outlook inbox via IMAP."""
    emails = await fetch_inbox(folder=folder, limit=limit)
    if not emails and not email_configured():
        # Return demo data so the UI is not empty before credentials are set
        return _demo_emails()
    return emails


@app.get("/api/email/{uid}/body")
async def get_email_body(uid: str, folder: str = "INBOX"):
    """Fetch the full body of one email (also marks it as read)."""
    body = await fetch_email_body(uid, folder)
    if body is None:
        raise HTTPException(404, "Email not found or Outlook not configured")
    return {"uid": uid, "body": body}


@app.get("/api/email/analyze")
async def analyze_email_inbox():
    """Fetch inbox and run Claude AI analysis on it."""
    emails = await fetch_inbox(limit=30)
    if not emails:
        emails = _demo_emails()
    analysis = await analyze_emails(emails)
    critical = [e for e in emails if e["priority"] in ("critical", "high")]
    return {"critical": critical, "summary": analysis.get("summary", "Email analysis complete.")}


@app.post("/api/email/send")
async def send_email_endpoint(req: EmailSendRequest):
    """Send an email via Outlook SMTP."""
    result = await outlook_send(
        to=req.to,
        subject=req.subject,
        body=req.body,
        cc=req.cc if req.cc else None,
        html=req.html,
    )
    if not result["sent"]:
        raise HTTPException(status_code=502, detail=result["error"])
    logger.info(f"Email sent via Outlook to {req.to}: {req.subject}")
    return {"sent": True, "messageId": get_id()}


def _demo_emails() -> list[dict]:
    """Placeholder emails shown before Outlook credentials are configured."""
    return [
        {
            "id": "demo-001",
            "from": "contracts@company.com",
            "subject": "URGENT: Tender Deadline Tomorrow — Project Alpha",
            "preview": "Submission deadline for Project Alpha tender is tomorrow at 5 PM.",
            "receivedAt": "2026-05-25T09:00:00Z",
            "priority": "critical",
            "category": "tender",
            "read": False,
        },
        {
            "id": "demo-002",
            "from": "procurement@client.org",
            "subject": "Request for Quotation — CNC Equipment Supply",
            "preview": "We are requesting quotations for the supply of CNC milling equipment.",
            "receivedAt": "2026-05-24T14:30:00Z",
            "priority": "high",
            "category": "rfq",
            "read": False,
        },
        {
            "id": "demo-003",
            "from": "legal@firm.com",
            "subject": "Contract Amendment — Action Required",
            "preview": "Please review and sign the attached contract amendment by end of week.",
            "receivedAt": "2026-05-22T16:00:00Z",
            "priority": "high",
            "category": "urgent",
            "read": False,
        },
    ]


# ─── Tasks ────────────────────────────────────────────────────────────────────

@app.get("/api/tasks")
async def list_tasks(db: Session = Depends(get_db)):
    tasks = db.query(TaskDB).order_by(TaskDB.created_at.desc()).all()
    return [
        {
            "id": t.id,
            "title": t.title,
            "description": t.description,
            "priority": t.priority,
            "status": t.status,
            "dueDate": t.due_date.isoformat() if t.due_date else None,
            "laptopSync": t.laptop_sync,
            "createdAt": t.created_at.isoformat(),
        }
        for t in tasks
    ]


@app.post("/api/tasks")
async def create_task(req: TaskCreate, db: Session = Depends(get_db)):
    task = TaskDB(
        title=req.title,
        description=req.description,
        priority=req.priority,
        status=req.status,
        due_date=datetime.fromisoformat(req.dueDate) if req.dueDate else None,
        laptop_sync=req.laptopSync,
    )
    db.add(task)
    db.commit()
    db.refresh(task)

    if req.laptopSync:
        await laptop_bridge.sync_task({"id": task.id, "title": req.title, "priority": req.priority})

    return {
        "id": task.id,
        "title": task.title,
        "description": task.description,
        "priority": task.priority,
        "status": task.status,
        "dueDate": task.due_date.isoformat() if task.due_date else None,
        "laptopSync": task.laptop_sync,
        "createdAt": task.created_at.isoformat(),
    }


@app.post("/api/tasks/{task_id}/sync-laptop")
async def sync_task_laptop(task_id: str, db: Session = Depends(get_db)):
    task = db.query(TaskDB).filter(TaskDB.id == task_id).first()
    if not task:
        raise HTTPException(404, "Task not found")
    synced = await laptop_bridge.sync_task({"id": task.id, "title": task.title, "priority": task.priority})
    if synced:
        task.laptop_sync = True
        db.commit()
    return {"synced": synced}


# ─── Documents ────────────────────────────────────────────────────────────────

@app.get("/api/documents")
async def list_documents(db: Session = Depends(get_db)):
    docs = db.query(DocumentDB).order_by(DocumentDB.created_at.desc()).all()
    return [
        {
            "id": d.id,
            "type": d.type,
            "title": d.title,
            "content": d.content,
            "status": d.status,
            "createdAt": d.created_at.isoformat(),
        }
        for d in docs
    ]


@app.post("/api/documents/generate")
async def api_generate_document(req: DocumentGenerate, db: Session = Depends(get_db)):
    content = await generate_document(req.type, req.title, req.context, req.recipient)
    doc = DocumentDB(type=req.type, title=req.title, content=content, status="draft")
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return {
        "id": doc.id,
        "type": doc.type,
        "title": doc.title,
        "content": doc.content,
        "status": doc.status,
        "createdAt": doc.created_at.isoformat(),
    }


# ─── Reports ──────────────────────────────────────────────────────────────────

@app.post("/api/reports/monthly")
async def api_monthly_report(data: dict, db: Session = Depends(get_db)):
    month = data.get("month", datetime.utcnow().strftime("%Y-%m"))

    meetings = db.query(MeetingDB).all()
    tasks = db.query(TaskDB).all()
    docs = db.query(DocumentDB).all()

    activities = {
        "meetings_count": len(meetings),
        "meetings": [m.title for m in meetings[:5]],
        "tasks_total": len(tasks),
        "tasks_completed": len([t for t in tasks if t.status == "completed"]),
        "documents_count": len(docs),
        "conversation_summary": f"Monthly data for {month}",
    }

    title = f"Monthly Activity Report — {month}"
    content = await generate_monthly_report(month, activities)
    doc = DocumentDB(type="report", title=title, content=content, status="ready")
    db.add(doc)
    db.commit()
    db.refresh(doc)

    return {
        "id": doc.id,
        "type": doc.type,
        "title": doc.title,
        "content": doc.content,
        "status": doc.status,
        "createdAt": doc.created_at.isoformat(),
    }


# ─── Laptop ───────────────────────────────────────────────────────────────────

@app.get("/api/laptop/status")
async def get_laptop_status():
    return {
        "connected": laptop_bridge.connected,
        "ip": laptop_bridge.laptop_info.get("ip"),
        "cpuUsage": laptop_bridge.laptop_info.get("cpuUsage"),
        "gpuUsage": laptop_bridge.laptop_info.get("gpuUsage"),
        "diskFree": laptop_bridge.laptop_info.get("diskFree"),
        "lastSeen": laptop_bridge.laptop_info.get("lastSeen"),
    }


@app.post("/api/laptop/connect")
async def connect_laptop(data: dict):
    ip = data.get("ip", "localhost")
    port = data.get("port", 8765)
    url = f"ws://{ip}:{port}"
    success = await laptop_bridge.connect(url)
    return {"success": success, "url": url}


@app.post("/api/laptop/files/read")
async def laptop_read_file(req: FileReadRequest):
    if not laptop_bridge.connected:
        raise HTTPException(503, "Laptop agent not connected")
    content = await laptop_bridge.read_file(req.path)
    return {"content": content or "", "size": len(content or "")}


@app.post("/api/laptop/files/write")
async def laptop_write_file(req: FileWriteRequest):
    if not laptop_bridge.connected:
        raise HTTPException(503, "Laptop agent not connected")
    success = await laptop_bridge.write_file(req.path, req.content)
    return {"success": success}


@app.post("/api/laptop/files/list")
async def laptop_list_files(req: FileDirRequest):
    if not laptop_bridge.connected:
        raise HTTPException(503, "Laptop agent not connected")
    result = await laptop_bridge.list_dir(req.dir)
    return result


# ─── WebSocket ────────────────────────────────────────────────────────────────

@app.websocket("/ws/client")
async def ws_client(ws: WebSocket):
    await client_manager.connect(ws)
    try:
        status = {
            "connected": laptop_bridge.connected,
            **laptop_bridge.laptop_info,
        }
        await client_manager.send(ws, "laptop_status", status)

        while True:
            try:
                data = await asyncio.wait_for(ws.receive_text(), timeout=30)
                msg = json.loads(data)
                if msg.get("type") == "ping":
                    await client_manager.send(ws, "pong", {})
            except asyncio.TimeoutError:
                await client_manager.send(ws, "ping", {})
    except WebSocketDisconnect:
        client_manager.disconnect(ws)
    except Exception:
        client_manager.disconnect(ws)


# ─── Static files (serve frontend) ────────────────────────────────────────────

FRONTEND_DIST = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
if os.path.isdir(FRONTEND_DIST):
    app.mount("/", StaticFiles(directory=FRONTEND_DIST, html=True), name="frontend")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=settings.host, port=settings.port, reload=True)
