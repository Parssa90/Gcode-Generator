"""
FastAPI router for the Teams Bot webhook and Teams-related REST endpoints.

Teams sends all bot activity to POST /api/teams/messages
The router validates the JWT, dispatches to ARIATeamsBot, and returns 200.
"""

import logging
from datetime import datetime

from botbuilder.core import BotFrameworkAdapter, BotFrameworkAdapterSettings
from botbuilder.integration.aiohttp import CloudAdapter, ConfigurationBotFrameworkAuthentication
from botbuilder.schema import Activity
from fastapi import APIRouter, Request, Response, HTTPException

from config import settings
from core.teams_bot import ARIATeamsBot
from core.teams_integration import get_upcoming_meetings, get_graph_token

logger = logging.getLogger("aria.teams_router")
router = APIRouter(prefix="/api/teams", tags=["Teams"])

# ── Bot adapter setup ─────────────────────────────────────────────────────────

_bot_settings = BotFrameworkAdapterSettings(
    app_id=settings.teams_bot_app_id,
    app_password=settings.teams_bot_app_password,
)
_adapter = BotFrameworkAdapter(_bot_settings)
_bot = ARIATeamsBot()


async def _on_error(context, error):
    logger.error(f"Teams bot error: {error}", exc_info=True)
    await context.send_activity("❌ An error occurred. Check the ARIA backend logs.")


_adapter.on_turn_error = _on_error


# ── Webhook endpoint (Teams → ARIA) ───────────────────────────────────────────

@router.post("/messages")
async def teams_messages(request: Request):
    """
    Main webhook endpoint. Teams POSTs all bot activities here.
    URL to register in Azure Bot: https://<your-domain>/api/teams/messages
    """
    if "application/json" not in request.headers.get("Content-Type", ""):
        raise HTTPException(status_code=415, detail="Expected application/json")

    body = await request.json()
    activity = Activity().deserialize(body)
    auth_header = request.headers.get("Authorization", "")

    try:
        invoke_response = await _adapter.process_activity(activity, auth_header, _bot.on_turn)
        if invoke_response:
            return Response(
                content=str(invoke_response.body),
                status_code=invoke_response.status,
                media_type="application/json",
            )
        return Response(status_code=200)
    except Exception as e:
        logger.error(f"Error processing Teams activity: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ── REST endpoints (ARIA dashboard → Teams data) ──────────────────────────────

@router.get("/status")
async def teams_status():
    """Check if Teams integration is configured."""
    configured = bool(
        settings.teams_bot_app_id
        and settings.teams_bot_app_password
        and settings.teams_tenant_id
    )
    token = await get_graph_token() if configured else None
    return {
        "configured": configured,
        "graph_token_valid": token is not None,
        "bot_app_id": settings.teams_bot_app_id or None,
        "tenant_id": settings.teams_tenant_id or None,
    }


@router.get("/meetings/upcoming")
async def upcoming_meetings(days: int = 7):
    """Return upcoming Teams meetings from the organizer's calendar."""
    meetings = await get_upcoming_meetings(days_ahead=days)
    return {"meetings": meetings, "count": len(meetings)}


@router.get("/meetings/{meeting_id}/notes")
async def get_meeting_notes(meeting_id: str):
    """
    On-demand: fetch transcript and generate meeting notes for a specific meeting.
    Useful if the bot missed the meetingEnd event.
    """
    from core.teams_integration import fetch_meeting_transcript, get_meeting_details
    from core.ai_engine import chat

    token = await get_graph_token()
    details = await get_meeting_details(meeting_id, token)
    transcript = await fetch_meeting_transcript(meeting_id, token)

    if not transcript:
        raise HTTPException(
            status_code=404,
            detail="No transcript found. Make sure transcription was enabled during the meeting.",
        )

    title = details.get("title", "Meeting")
    attendees = details.get("attendees", [])
    duration = details.get("duration", "")

    prompt = f"""Generate structured meeting notes.

Meeting: {title}
Duration: {duration}
Attendees: {', '.join(attendees)}

Transcript:
{transcript[:12000]}

Sections:
## 📋 Summary
## ✅ Action Items (task — owner — deadline)
## 📌 Key Decisions
## 💬 Key Discussion Points
## 📅 Follow-ups"""

    notes, _ = await chat(prompt, [], {})

    return {
        "meeting_id": meeting_id,
        "title": title,
        "duration": duration,
        "attendees": attendees,
        "notes": notes,
        "generated_at": datetime.utcnow().isoformat(),
    }
