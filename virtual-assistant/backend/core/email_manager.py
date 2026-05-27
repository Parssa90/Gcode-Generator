"""
Outlook Email Manager
Handles sending and reading emails via Outlook / Office 365.

Send:  SMTP with STARTTLS  (smtp.office365.com : 587)
Read:  IMAP over SSL       (outlook.office365.com : 993)

For personal Outlook.com accounts the same servers work.
If your organisation uses on-prem Exchange, change SMTP_HOST / IMAP_HOST
in .env to your Exchange server address.
"""

import asyncio
import email as email_lib
import imaplib
import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import parsedate_to_datetime
from typing import Optional

from config import settings

logger = logging.getLogger("aria.email")

# ── Outlook / Office 365 server defaults ──────────────────────────────────────
SMTP_HOST = "smtp.office365.com"
SMTP_PORT = 587
IMAP_HOST = "outlook.office365.com"
IMAP_PORT = 993


# ── Send ──────────────────────────────────────────────────────────────────────

async def send_email(
    to: list[str],
    subject: str,
    body: str,
    cc: Optional[list[str]] = None,
    html: bool = False,
) -> dict:
    """
    Send an email via Outlook SMTP.
    Returns {"sent": True/False, "error": "..." or None}
    """
    if not settings.outlook_email or not settings.outlook_password:
        return {
            "sent": False,
            "error": "Outlook credentials not configured. "
                     "Add OUTLOOK_EMAIL and OUTLOOK_PASSWORD to backend/.env",
        }

    def _send():
        msg = MIMEMultipart("alternative")
        msg["From"] = settings.outlook_email
        msg["To"] = ", ".join(to)
        msg["Subject"] = subject
        if cc:
            msg["Cc"] = ", ".join(cc)

        mime_type = "html" if html else "plain"
        msg.attach(MIMEText(body, mime_type, "utf-8"))

        all_recipients = to + (cc or [])

        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=20) as server:
            server.ehlo()
            server.starttls()
            server.login(settings.outlook_email, settings.outlook_password)
            server.sendmail(settings.outlook_email, all_recipients, msg.as_string())

    try:
        await asyncio.to_thread(_send)
        logger.info(f"Email sent to {to}: {subject}")
        return {"sent": True, "error": None}
    except smtplib.SMTPAuthenticationError:
        msg = (
            "Authentication failed. If you use MFA, generate an App Password "
            "at account.microsoft.com → Security → App passwords."
        )
        logger.error(msg)
        return {"sent": False, "error": msg}
    except Exception as e:
        logger.error(f"Failed to send email: {e}")
        return {"sent": False, "error": str(e)}


# ── Read (IMAP) ───────────────────────────────────────────────────────────────

async def fetch_inbox(folder: str = "INBOX", limit: int = 20) -> list[dict]:
    """
    Fetch emails from Outlook via IMAP.
    Returns a list of email summary dicts compatible with the frontend schema.
    """
    if not settings.outlook_email or not settings.outlook_password:
        logger.warning("Outlook credentials not set — returning empty inbox")
        return []

    def _fetch():
        results = []
        with imaplib.IMAP4_SSL(IMAP_HOST, IMAP_PORT) as imap:
            imap.login(settings.outlook_email, settings.outlook_password)
            imap.select(folder)

            # Search all messages, newest first
            _, data = imap.search(None, "ALL")
            ids = data[0].split()
            ids = ids[-limit:]  # keep last N
            ids.reverse()       # newest first

            for uid in ids:
                try:
                    _, msg_data = imap.fetch(uid, "(RFC822 FLAGS)")
                    raw = msg_data[0][1]
                    flags = str(msg_data[0][0])
                    msg = email_lib.message_from_bytes(raw)

                    subject = _decode_header(msg["Subject"] or "(no subject)")
                    from_addr = _decode_header(msg["From"] or "")
                    date_str = msg.get("Date", "")

                    try:
                        received_at = parsedate_to_datetime(date_str).isoformat()
                    except Exception:
                        received_at = ""

                    body = _get_body(msg)
                    preview = body[:200].replace("\r\n", " ").replace("\n", " ").strip()

                    is_read = "\\Seen" in flags

                    results.append({
                        "id": uid.decode(),
                        "from": from_addr,
                        "subject": subject,
                        "preview": preview,
                        "receivedAt": received_at,
                        "priority": _infer_priority(subject),
                        "category": _infer_category(subject),
                        "read": is_read,
                    })
                except Exception as e:
                    logger.warning(f"Skipping message {uid}: {e}")

        return results

    try:
        return await asyncio.to_thread(_fetch)
    except imaplib.IMAP4.error as e:
        logger.error(f"IMAP auth error: {e}")
        return []
    except Exception as e:
        logger.error(f"IMAP fetch failed: {e}")
        return []


async def fetch_email_body(uid: str, folder: str = "INBOX") -> Optional[str]:
    """Fetch the full body of a single email by UID."""
    if not settings.outlook_email or not settings.outlook_password:
        return None

    def _fetch():
        with imaplib.IMAP4_SSL(IMAP_HOST, IMAP_PORT) as imap:
            imap.login(settings.outlook_email, settings.outlook_password)
            imap.select(folder)
            _, msg_data = imap.fetch(uid.encode(), "(RFC822)")
            raw = msg_data[0][1]
            msg = email_lib.message_from_bytes(raw)
            # Mark as read
            imap.store(uid.encode(), "+FLAGS", "\\Seen")
            return _get_body(msg)

    try:
        return await asyncio.to_thread(_fetch)
    except Exception as e:
        logger.error(f"Failed to fetch email body: {e}")
        return None


# ── Helpers ───────────────────────────────────────────────────────────────────

def _decode_header(value: str) -> str:
    """Decode RFC2047-encoded email header."""
    try:
        from email.header import decode_header as _dh
        parts = _dh(value)
        decoded = []
        for text, charset in parts:
            if isinstance(text, bytes):
                decoded.append(text.decode(charset or "utf-8", errors="replace"))
            else:
                decoded.append(text)
        return " ".join(decoded)
    except Exception:
        return value


def _get_body(msg: email_lib.message.Message) -> str:
    """Extract plain-text body from a MIME message."""
    if msg.is_multipart():
        for part in msg.walk():
            ct = part.get_content_type()
            cd = str(part.get("Content-Disposition", ""))
            if ct == "text/plain" and "attachment" not in cd:
                try:
                    return part.get_payload(decode=True).decode(
                        part.get_content_charset() or "utf-8", errors="replace"
                    )
                except Exception:
                    pass
    else:
        try:
            return msg.get_payload(decode=True).decode(
                msg.get_content_charset() or "utf-8", errors="replace"
            )
        except Exception:
            pass
    return ""


def _infer_priority(subject: str) -> str:
    s = subject.lower()
    if any(w in s for w in ["urgent", "asap", "immediately", "critical", "deadline"]):
        return "critical"
    if any(w in s for w in ["important", "action required", "rfq", "tender", "contract"]):
        return "high"
    return "normal"


def _infer_category(subject: str) -> str:
    s = subject.lower()
    if "tender" in s or "itb" in s or "invitation to bid" in s:
        return "tender"
    if "rfq" in s or "quotation" in s or "quote" in s:
        return "rfq"
    if "meeting" in s or "invite" in s or "calendar" in s:
        return "meeting"
    if "urgent" in s or "action required" in s or "critical" in s:
        return "urgent"
    return "general"


def is_configured() -> bool:
    """Return True if Outlook credentials are set."""
    return bool(settings.outlook_email and settings.outlook_password)
