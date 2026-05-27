"""
Microsoft Graph API integration for Teams meetings.

Handles:
- Fetching meeting transcripts (after meeting ends)
- Getting meeting details (attendees, duration, subject)
- Posting meeting notes back to Teams

Permissions required in Azure AD app registration:
  OnlineMeetingTranscript.Read.All   (application)
  OnlineMeeting.Read.All             (application)
  Chat.ReadWrite                     (application, for posting notes)
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Optional

import httpx

from config import settings

logger = logging.getLogger("aria.teams")

GRAPH_BASE = "https://graph.microsoft.com/v1.0"
GRAPH_BETA = "https://graph.microsoft.com/beta"   # transcripts still in beta for some tenants


# ── OAuth token (client credentials flow) ─────────────────────────────────────

_token_cache: dict = {"token": None, "expires_at": datetime.min}


async def get_graph_token() -> Optional[str]:
    """
    Get a valid Microsoft Graph access token using client credentials.
    Caches the token and refreshes 5 minutes before expiry.
    """
    global _token_cache

    if _token_cache["token"] and datetime.utcnow() < _token_cache["expires_at"]:
        return _token_cache["token"]

    if not all([settings.teams_tenant_id, settings.teams_client_id, settings.teams_client_secret]):
        logger.warning("Teams Azure credentials not configured (TEAMS_TENANT_ID etc.)")
        return None

    url = f"https://login.microsoftonline.com/{settings.teams_tenant_id}/oauth2/v2.0/token"
    data = {
        "grant_type": "client_credentials",
        "client_id": settings.teams_client_id,
        "client_secret": settings.teams_client_secret,
        "scope": "https://graph.microsoft.com/.default",
    }

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(url, data=data)
            resp.raise_for_status()
            token_data = resp.json()

        _token_cache["token"] = token_data["access_token"]
        _token_cache["expires_at"] = datetime.utcnow() + timedelta(
            seconds=token_data.get("expires_in", 3600) - 300
        )
        logger.info("Microsoft Graph token refreshed")
        return _token_cache["token"]
    except Exception as e:
        logger.error(f"Failed to get Graph token: {e}")
        return None


# ── Meeting transcript ─────────────────────────────────────────────────────────

async def fetch_meeting_transcript(
    meeting_id: str,
    token: Optional[str] = None,
    organizer_id: Optional[str] = None,
) -> Optional[str]:
    """
    Fetch the transcript of a Teams meeting via Graph API.
    Returns the plain-text transcript or None if unavailable.

    Note: Transcription must be enabled in the meeting for this to work.
    """
    token = token or await get_graph_token()
    if not token:
        return None

    headers = {"Authorization": f"Bearer {token}"}

    # Try with organizer_id (required for application permissions)
    user_id = organizer_id or settings.teams_organizer_user_id
    if not user_id:
        logger.warning("TEAMS_ORGANIZER_USER_ID not set — cannot fetch transcript")
        return None

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            # List transcripts for this meeting
            url = f"{GRAPH_BETA}/users/{user_id}/onlineMeetings/{meeting_id}/transcripts"
            resp = await client.get(url, headers=headers)

            if resp.status_code == 404:
                logger.info("No transcript found — transcription may not have been enabled")
                return None

            resp.raise_for_status()
            transcripts = resp.json().get("value", [])

            if not transcripts:
                logger.info("Transcript list is empty — meeting may have just ended, retry in 30s")
                await asyncio.sleep(30)
                resp = await client.get(url, headers=headers)
                transcripts = resp.json().get("value", [])

            if not transcripts:
                return None

            # Get the content of the latest transcript
            latest = transcripts[-1]
            transcript_id = latest["id"]
            content_url = f"{GRAPH_BETA}/users/{user_id}/onlineMeetings/{meeting_id}/transcripts/{transcript_id}/content"
            content_resp = await client.get(content_url, headers=headers)
            content_resp.raise_for_status()

            # Parse VTT format into plain text
            return _parse_vtt(content_resp.text)

    except httpx.HTTPStatusError as e:
        logger.error(f"Graph API error fetching transcript: {e.response.status_code} {e.response.text[:200]}")
        return None
    except Exception as e:
        logger.error(f"Error fetching transcript: {e}")
        return None


def _parse_vtt(vtt_content: str) -> str:
    """Convert WebVTT transcript format to readable plain text."""
    lines = vtt_content.splitlines()
    text_parts = []
    speaker = ""
    for line in lines:
        line = line.strip()
        if not line or line == "WEBVTT" or "-->" in line:
            continue
        # Speaker lines look like: <v Speaker Name>text</v>
        if line.startswith("<v ") and ">" in line:
            end = line.index(">")
            speaker = line[3:end]
            content = line[end + 1:].replace("</v>", "").strip()
            if content:
                text_parts.append(f"{speaker}: {content}")
        elif line and not line.isdigit():
            if speaker:
                text_parts.append(f"{speaker}: {line}")
            else:
                text_parts.append(line)

    return "\n".join(text_parts)


# ── Meeting details ────────────────────────────────────────────────────────────

async def get_meeting_details(
    meeting_id: str,
    token: Optional[str] = None,
    organizer_id: Optional[str] = None,
) -> dict:
    """
    Fetch meeting metadata: title, duration, attendees.
    Returns a dict with keys: title, duration, attendees, start_time, end_time
    """
    token = token or await get_graph_token()
    user_id = organizer_id or settings.teams_organizer_user_id

    if not token or not user_id:
        return {}

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            url = f"{GRAPH_BASE}/users/{user_id}/onlineMeetings/{meeting_id}"
            resp = await client.get(url, headers={"Authorization": f"Bearer {token}"})
            resp.raise_for_status()
            data = resp.json()

        attendees = [
            p.get("identity", {}).get("user", {}).get("displayName", "Unknown")
            for p in data.get("participants", {}).get("attendees", [])
        ]

        start = data.get("startDateTime", "")
        end = data.get("endDateTime", "")
        duration = ""
        if start and end:
            try:
                s = datetime.fromisoformat(start.replace("Z", "+00:00"))
                e = datetime.fromisoformat(end.replace("Z", "+00:00"))
                mins = int((e - s).total_seconds() / 60)
                duration = f"{mins} minutes"
            except Exception:
                pass

        return {
            "title": data.get("subject", "Meeting"),
            "duration": duration,
            "attendees": attendees,
            "start_time": start,
            "end_time": end,
        }
    except Exception as e:
        logger.warning(f"Could not fetch meeting details: {e}")
        return {}


# ── Post notes back to Teams ───────────────────────────────────────────────────

async def post_meeting_notes(
    chat_id: str,
    notes_markdown: str,
    token: Optional[str] = None,
) -> bool:
    """
    Post the generated meeting notes as a message in a Teams chat/channel.
    chat_id can be the meeting chat ID or a channel ID.
    """
    token = token or await get_graph_token()
    if not token:
        return False

    # Convert basic Markdown to Teams-compatible HTML
    html_body = _markdown_to_teams_html(notes_markdown)

    payload = {
        "body": {
            "contentType": "html",
            "content": html_body,
        }
    }

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            url = f"{GRAPH_BASE}/chats/{chat_id}/messages"
            resp = await client.post(
                url,
                json=payload,
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json",
                },
            )
            resp.raise_for_status()
        logger.info(f"Meeting notes posted to Teams chat {chat_id[:20]}...")
        return True
    except Exception as e:
        logger.error(f"Failed to post meeting notes to Teams: {e}")
        return False


def _markdown_to_teams_html(md: str) -> str:
    """Minimal Markdown → HTML for Teams messages."""
    import re
    html = md
    # Headers
    html = re.sub(r"^## (.+)$", r"<h3>\1</h3>", html, flags=re.MULTILINE)
    html = re.sub(r"^# (.+)$", r"<h2>\1</h2>", html, flags=re.MULTILINE)
    # Bold
    html = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", html)
    # Bullets
    html = re.sub(r"^[•\-\*] (.+)$", r"<li>\1</li>", html, flags=re.MULTILINE)
    html = re.sub(r"(<li>.*</li>\n?)+", r"<ul>\g<0></ul>", html)
    # Newlines
    html = html.replace("\n\n", "<br/>")
    return html


# ── Calendar: list upcoming meetings ──────────────────────────────────────────

async def get_upcoming_meetings(
    user_id: Optional[str] = None,
    days_ahead: int = 7,
) -> list[dict]:
    """
    Return the next N days of calendar events for the configured user.
    Useful for showing ARIA which meetings it's been invited to.
    """
    token = await get_graph_token()
    uid = user_id or settings.teams_organizer_user_id
    if not token or not uid:
        return []

    now = datetime.utcnow()
    end = now + timedelta(days=days_ahead)
    params = {
        "startDateTime": now.isoformat() + "Z",
        "endDateTime": end.isoformat() + "Z",
        "$select": "subject,start,end,attendees,onlineMeeting",
        "$orderby": "start/dateTime",
        "$top": "50",
    }

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            url = f"{GRAPH_BASE}/users/{uid}/calendarView"
            resp = await client.get(
                url,
                params=params,
                headers={"Authorization": f"Bearer {token}"},
            )
            resp.raise_for_status()
            events = resp.json().get("value", [])

        results = []
        for ev in events:
            # Only include Teams meetings (those with an onlineMeeting link)
            if ev.get("onlineMeeting"):
                results.append({
                    "id": ev.get("id"),
                    "title": ev.get("subject", "Meeting"),
                    "startTime": ev.get("start", {}).get("dateTime", ""),
                    "endTime": ev.get("end", {}).get("dateTime", ""),
                    "joinUrl": ev.get("onlineMeeting", {}).get("joinUrl", ""),
                    "attendees": [
                        a.get("emailAddress", {}).get("address", "")
                        for a in ev.get("attendees", [])
                    ],
                })
        return results
    except Exception as e:
        logger.error(f"Failed to fetch calendar: {e}")
        return []
