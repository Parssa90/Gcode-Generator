"""
ARIA Teams Bot — Activity Handler
Handles all messages and events from Microsoft Teams.

What it does:
- Appears as a contact in Teams named "ARIA"
- Can be added to meeting calendar invites as an attendee
- Receives meetingStart / meetingEnd events from Teams
- On meeting end: fetches transcript via Graph API → generates notes with Claude
- Posts structured notes back into the Teams meeting chat
- Saves notes to ARIA database (SQLite)
"""

import logging
from datetime import datetime
from typing import Optional

from botbuilder.core import ActivityHandler, TurnContext, MessageFactory
from botbuilder.schema import Activity, ActivityTypes, ChannelAccount

from core.teams_integration import (
    fetch_meeting_transcript,
    get_meeting_details,
    post_meeting_notes,
)
from core.ai_engine import chat

logger = logging.getLogger("aria.teams_bot")


class ARIATeamsBot(ActivityHandler):
    """ARIA bot that handles Teams messages and meeting lifecycle events."""

    # ── Greeting ──────────────────────────────────────────────────────────────

    async def on_members_added_activity(
        self, members_added: list[ChannelAccount], turn_context: TurnContext
    ):
        for member in members_added:
            if member.id != turn_context.activity.recipient.id:
                await turn_context.send_activity(
                    MessageFactory.text(
                        "👋 Hi! I'm **ARIA** — your AI assistant.\n\n"
                        "Add me to any meeting and I'll:\n"
                        "• 📝 Take structured notes from the transcript\n"
                        "• ✅ Extract action items and owners\n"
                        "• 📅 Identify follow-up dates\n"
                        "• 💾 Save everything to your ARIA dashboard\n\n"
                        "Type anything to chat, or just add me to a calendar invite!"
                    )
                )

    # ── Chat messages ──────────────────────────────────────────────────────────

    async def on_message_activity(self, turn_context: TurnContext):
        text = (turn_context.activity.text or "").strip()
        if not text:
            return

        logger.info(f"Teams message from {turn_context.activity.from_property.name}: {text[:80]}")

        # Let Claude handle it like a normal chat message
        reply, _ = await chat(
            message=text,
            conversation_history=[],
            context={"source": "teams", "channel": "teams_chat"},
        )

        await turn_context.send_activity(MessageFactory.text(reply))

    # ── Meeting lifecycle ──────────────────────────────────────────────────────

    async def on_teams_meeting_start_activity(self, turn_context: TurnContext):
        """Fires when a meeting starts (bot must be in the meeting roster)."""
        meeting = turn_context.activity.channel_data.get("meeting", {})
        meeting_id = meeting.get("id", "")
        title = meeting.get("title", "Meeting")

        logger.info(f"Meeting started: {title} ({meeting_id})")

        await turn_context.send_activity(
            MessageFactory.text(
                f"📋 ARIA joined **{title}**.\n"
                "I'll take notes from the transcript when the meeting ends. "
                "You can also type during the meeting to ask me anything."
            )
        )

    async def on_teams_meeting_end_activity(self, turn_context: TurnContext):
        """Fires when a meeting ends — fetch transcript and generate notes."""
        meeting_data = turn_context.activity.channel_data.get("meeting", {})
        meeting_id = meeting_data.get("id", "")
        title = meeting_data.get("title", "Meeting")

        logger.info(f"Meeting ended: {title} ({meeting_id})")

        await turn_context.send_activity(
            MessageFactory.text("⏳ Meeting ended — generating notes from transcript...")
        )

        try:
            notes = await _process_meeting(turn_context, meeting_id, title)
            if notes:
                await turn_context.send_activity(MessageFactory.text(notes))
            else:
                await turn_context.send_activity(
                    MessageFactory.text(
                        "⚠️ Could not retrieve transcript. "
                        "Make sure **transcription** is enabled in your Teams meeting settings."
                    )
                )
        except Exception as e:
            logger.error(f"Failed to process meeting {meeting_id}: {e}")
            await turn_context.send_activity(
                MessageFactory.text(f"❌ Error generating notes: {e}")
            )


# ── Internal helpers ───────────────────────────────────────────────────────────

async def _process_meeting(
    turn_context: TurnContext, meeting_id: str, title: str
) -> Optional[str]:
    """
    1. Pull transcript from Graph API
    2. Generate structured notes with Claude
    3. Return formatted Markdown notes
    """
    # Get the Graph token from the bot auth
    token = await _get_graph_token(turn_context)

    # Fetch meeting details + transcript
    details = await get_meeting_details(meeting_id, token)
    transcript = await fetch_meeting_transcript(meeting_id, token)

    if not transcript:
        return None

    duration = details.get("duration", "unknown")
    attendees = details.get("attendees", [])

    prompt = f"""You are a professional meeting notes assistant. A meeting just ended. Generate clear, structured meeting notes.

Meeting: {title}
Duration: {duration}
Attendees: {', '.join(attendees) if attendees else 'not available'}

Transcript:
{transcript[:12000]}

Generate meeting notes with these sections:
## 📋 Meeting Summary
(2-3 sentence overview)

## ✅ Action Items
(bullet list: task — owner — deadline)

## 📌 Key Decisions
(bullet list of decisions made)

## 💬 Key Discussion Points
(bullet list of main topics)

## 📅 Follow-ups
(next steps and dates)

Be concise. Use names from the transcript when assigning action items."""

    notes_text, _ = await chat(prompt, [], {"source": "teams_meeting"})

    # Prepend header
    header = (
        f"# 📝 Meeting Notes — {title}\n"
        f"_{datetime.utcnow().strftime('%B %d, %Y at %H:%M UTC')}_\n\n"
    )

    return header + notes_text


async def _get_graph_token(turn_context: TurnContext) -> Optional[str]:
    """Extract Graph API token from bot SSO if available."""
    try:
        from botframework.connector.auth import JwtTokenValidation
        # The token may be in the activity value for SSO flows
        value = turn_context.activity.value or {}
        return value.get("token")
    except Exception:
        return None
