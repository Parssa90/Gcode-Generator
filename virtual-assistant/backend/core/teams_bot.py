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

Voice feature:
- Detects when anyone mentions "ARIA" or "@ARIA" in meeting chat
- Generates a spoken audio reply via Azure TTS (en-US-AriaNeural)
- Posts the WAV file as an audio attachment in the chat
- Note: true bot-speaks-into-call audio requires the C# Real-Time Media Platform
  SDK (Windows Azure VM only) — not feasible in our Python stack.
  Chat-based TTS covers the practical use case just as well.
"""

import logging
import os
import re
import base64
import tempfile
from datetime import datetime
from typing import Optional

from botbuilder.core import ActivityHandler, TurnContext, MessageFactory
from botbuilder.schema import (
    Activity, ActivityTypes, ChannelAccount,
    Attachment, AttachmentData,
)

from core.teams_integration import (
    fetch_meeting_transcript,
    get_meeting_details,
    post_meeting_notes,
)
from core.ai_engine import chat
import core.tts as tts_module

logger = logging.getLogger("aria.teams_bot")

# Regex: catches "ARIA", "@ARIA", "Hey ARIA", "aria" (case-insensitive)
_ARIA_MENTION = re.compile(r"\baria\b", re.IGNORECASE)


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

        sender = turn_context.activity.from_property.name or "someone"
        logger.info(f"Teams message from {sender}: {text[:80]}")

        # Check whether ARIA is being addressed
        aria_addressed = bool(_ARIA_MENTION.search(text))

        # Let Claude generate a reply
        reply, _ = await chat(
            message=text,
            conversation_history=[],
            context={"source": "teams", "channel": "teams_chat"},
        )

        # Always send text reply
        await turn_context.send_activity(MessageFactory.text(reply))

        # If ARIA was called by name AND Azure TTS is set up → also send audio
        if aria_addressed and tts_module.is_configured():
            await _send_tts_reply(turn_context, reply)

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

async def _send_tts_reply(turn_context: TurnContext, text: str) -> None:
    """
    Generate a WAV file via Azure TTS and post it as an audio attachment
    in the Teams chat.  Teams renders it as an inline audio player.

    Teams attachment flow for audio:
      1. Call TTS → get WAV bytes
      2. Base64-encode the bytes
      3. Attach as contentType="audio/wav" with the base64 data URI
         (for small WAVs < 4 MB — sufficient for typical replies)
    """
    try:
        wav_bytes = await tts_module.text_to_speech_bytes(text)
        if not wav_bytes:
            logger.warning("TTS returned no audio — skipping voice reply")
            return

        # Keep audio short in Teams context; truncate if > 4 MB
        if len(wav_bytes) > 4 * 1024 * 1024:
            logger.warning("TTS audio > 4 MB — skipping voice attachment")
            return

        b64 = base64.b64encode(wav_bytes).decode("utf-8")
        data_uri = f"data:audio/wav;base64,{b64}"

        attachment = Attachment(
            content_type="audio/wav",
            content_url=data_uri,
            name="aria-reply.wav",
        )
        audio_activity = MessageFactory.text("")
        audio_activity.attachments = [attachment]
        await turn_context.send_activity(audio_activity)
        logger.info("TTS audio attachment sent to Teams chat")

    except Exception as exc:
        logger.error(f"Failed to send TTS audio: {exc}")


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
