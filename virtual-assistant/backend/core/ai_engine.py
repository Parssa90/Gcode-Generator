import anthropic
from typing import Optional
from config import settings

client = anthropic.Anthropic(api_key=settings.anthropic_api_key) if settings.anthropic_api_key else None

SYSTEM_PROMPT = """You are ARIA (AI Remote Intelligence Assistant), a highly capable professional AI assistant.

You help the user with:
- Writing and organizing notes (structured, tagged, searchable)
- Scheduling and managing meetings (create calendar events, invite attendees)
- Drafting professional documents: tenders, RFQs, memos, proposals
- Reading and analyzing emails (identify critical threads, summarize conversations)
- Creating monthly reports from activity logs
- Managing tasks with priorities and laptop sync
- Reading/writing files on the user's connected laptop

When the user asks you to perform an action, respond with:
1. A clear confirmation of what you're doing
2. The result or content
3. If applicable, suggest follow-up actions

For document generation (tender/RFQ/report):
- Use professional language
- Include all standard sections for the document type
- Format with Markdown headers and structure

Keep responses concise but thorough. Use Markdown formatting for clarity.
When you detect an intent to create notes, meetings, documents, or tasks,
include structured data in your response that the system can parse.

Today's context: You are running as a mobile/web assistant. The user may also have a laptop agent connected."""


async def chat(
    message: str,
    conversation_history: list[dict],
    context: Optional[dict] = None,
) -> tuple[str, Optional[dict]]:
    """
    Send a message to Claude and get a response with optional action.
    Returns (reply_text, action_dict).
    """
    if not client:
        return _mock_response(message), None

    messages = conversation_history + [{"role": "user", "content": message}]

    system = SYSTEM_PROMPT
    if context:
        system += f"\n\nCurrent context: {context}"

    try:
        response = client.messages.create(
            model=settings.claude_model,
            max_tokens=4096,
            system=system,
            messages=messages,
        )
        reply = response.content[0].text
        action = _detect_action(message, reply)
        return reply, action
    except Exception as e:
        return f"I encountered an error: {str(e)}. Please check your API configuration.", None


async def generate_document(doc_type: str, title: str, context: str, recipient: Optional[str] = None) -> str:
    """Generate a professional document using Claude."""
    if not client:
        return _mock_document(doc_type, title)

    type_instructions = {
        "tender": "Create a formal Invitation to Tender (ITT) document with: Introduction, Project Overview, Scope of Work, Requirements, Evaluation Criteria, Submission Instructions, Terms & Conditions",
        "rfq": "Create a Request for Quotation (RFQ) with: Introduction, Items/Services Required (with specs), Quantity, Delivery Requirements, Submission Instructions, Evaluation Criteria, Contact Information",
        "report": "Create a Monthly Activity Report with: Executive Summary, Key Achievements, Activities Completed, Issues & Challenges, Financial Summary, Next Month's Plan, Appendices",
        "memo": "Create a professional Internal Memorandum with: Header (To/From/Date/Subject), Summary, Background, Key Points, Required Actions, Deadline",
    }

    prompt = f"""Generate a professional {doc_type.upper()} document.

Title: {title}
{f"Recipient/Company: {recipient}" if recipient else ""}
Context/Requirements: {context}

Instructions: {type_instructions.get(doc_type, 'Create a professional document')}

Format the document with proper Markdown headings, bullet points, and tables where appropriate.
Make it complete, professional, and ready to use."""

    try:
        response = client.messages.create(
            model=settings.claude_model,
            max_tokens=8192,
            messages=[{"role": "user", "content": prompt}],
        )
        return response.content[0].text
    except Exception as e:
        return _mock_document(doc_type, title)


async def generate_monthly_report(month: str, activities: dict) -> str:
    """Generate a monthly activity report from logged data."""
    if not client:
        return _mock_report(month)

    prompt = f"""Generate a comprehensive Monthly Activity Report for {month}.

Activity Data:
- Meetings held: {activities.get('meetings_count', 0)} meetings
- Meeting details: {activities.get('meetings', [])}
- Notes created: {activities.get('notes_count', 0)}
- Tasks completed: {activities.get('tasks_completed', 0)} of {activities.get('tasks_total', 0)}
- Emails processed: {activities.get('emails_count', 0)}
- Documents generated: {activities.get('documents_count', 0)}
- Conversation summaries: {activities.get('conversation_summary', 'No data available')}

Generate a professional Monthly Report with:
1. Executive Summary
2. Key Achievements
3. Meetings & Collaboration
4. Task Completion Status
5. Communication Overview
6. Documents & Deliverables
7. Issues & Action Items
8. Next Month Priorities

Use professional language and Markdown formatting."""

    try:
        response = client.messages.create(
            model=settings.claude_model,
            max_tokens=8192,
            messages=[{"role": "user", "content": prompt}],
        )
        return response.content[0].text
    except Exception:
        return _mock_report(month)


async def analyze_emails(email_summaries: list[dict]) -> dict:
    """Analyze emails and identify critical ones."""
    if not client or not email_summaries:
        return {"critical": [], "summary": "No emails to analyze."}

    email_text = "\n".join([
        f"- From: {e.get('from')}, Subject: {e.get('subject')}, Preview: {e.get('preview', '')[:100]}"
        for e in email_summaries[:20]
    ])

    prompt = f"""Analyze these emails and identify:
1. Critical emails requiring immediate attention
2. Tender/RFQ related emails
3. Meeting requests
4. Overall summary

Emails:
{email_text}

Respond with a JSON object: {{"critical_ids": [...], "summary": "..."}}"""

    try:
        response = client.messages.create(
            model=settings.claude_model,
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}],
        )
        return {"critical": [], "summary": response.content[0].text}
    except Exception:
        return {"critical": [], "summary": "Could not analyze emails."}


def _detect_action(message: str, reply: str) -> Optional[dict]:
    """Detect if the response warrants a UI action."""
    msg_lower = message.lower()
    if any(kw in msg_lower for kw in ["write a note", "create note", "take note", "note down"]):
        return {"type": "create_note", "payload": {}}
    if any(kw in msg_lower for kw in ["schedule", "book a meeting", "arrange meeting", "set up meeting"]):
        return {"type": "schedule_meeting", "payload": {}}
    if any(kw in msg_lower for kw in ["generate rfq", "create rfq", "write rfq", "send rfq"]):
        return {"type": "create_document", "payload": {"type": "rfq"}}
    if any(kw in msg_lower for kw in ["generate tender", "create tender", "write tender"]):
        return {"type": "create_document", "payload": {"type": "tender"}}
    if any(kw in msg_lower for kw in ["monthly report", "generate report", "activity report"]):
        return {"type": "generate_report", "payload": {}}
    if any(kw in msg_lower for kw in ["read emails", "check emails", "email inbox"]):
        return {"type": "read_emails", "payload": {}}
    return None


def _mock_response(message: str) -> str:
    return (
        "I'm ARIA, your AI assistant. I'm currently running without an API key configured. "
        "To enable full AI capabilities, add your `ANTHROPIC_API_KEY` to the `.env` file in the backend directory.\n\n"
        "I can help you with:\n"
        "- **Notes**: Organize and search your notes\n"
        "- **Calendar**: Schedule and manage meetings\n"
        "- **Email**: Read and analyze your emails\n"
        "- **Documents**: Generate tenders, RFQs, reports\n"
        "- **Tasks**: Manage and sync tasks to your laptop\n"
        "- **Laptop**: Connect and control your laptop remotely\n"
    )


def _mock_document(doc_type: str, title: str) -> str:
    return f"""# {title}

**Document Type:** {doc_type.upper()}
**Status:** Draft
**Date:** {__import__('datetime').datetime.now().strftime('%B %d, %Y')}

---

## Introduction

This {doc_type} has been prepared in accordance with standard professional requirements.

## Scope

*This section would contain the detailed scope based on your requirements.*

## Requirements

- Requirement 1
- Requirement 2
- Requirement 3

## Terms and Conditions

Standard terms and conditions apply.

---

*Note: Configure ANTHROPIC_API_KEY to generate full AI-powered documents.*
"""


def _mock_report(month: str) -> str:
    return f"""# Monthly Activity Report — {month}

## Executive Summary

This report covers all activities for the period of {month}.

## Key Achievements

- Completed scheduled meetings
- Processed incoming correspondence
- Generated required documentation

## Next Steps

- Continue with planned activities
- Follow up on pending items

---

*Note: Configure ANTHROPIC_API_KEY to generate AI-powered reports with full activity analysis.*
"""
