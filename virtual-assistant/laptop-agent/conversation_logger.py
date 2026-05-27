"""
Local conversation logger — stores ALL conversations locally on the laptop.
Nothing is missed; everything is persisted in JSON Lines format.
"""

import json
import os
from datetime import datetime
from pathlib import Path


class ConversationLogger:
    def __init__(self, log_dir: Path):
        self.log_dir = log_dir
        self.log_dir.mkdir(parents=True, exist_ok=True)
        self._current_file = None
        self._current_date = None

    def _get_log_file(self) -> Path:
        today = datetime.utcnow().strftime("%Y-%m-%d")
        if today != self._current_date:
            self._current_date = today
            self._current_file = self.log_dir / f"conversations_{today}.jsonl"
        return self._current_file

    def log(self, data: dict):
        """Log a conversation entry."""
        entry = {
            "timestamp": datetime.utcnow().isoformat(),
            **data,
        }
        log_file = self._get_log_file()
        with open(log_file, "a", encoding="utf-8") as f:
            f.write(json.dumps(entry, ensure_ascii=False) + "\n")

    def log_conversation(self, conversation_id: str, role: str, content: str, is_voice: bool = False):
        """Log a chat message."""
        self.log({
            "type": "message",
            "conversation_id": conversation_id,
            "role": role,
            "content": content,
            "is_voice": is_voice,
        })

    def log_task(self, task: dict):
        """Log a task sync event."""
        self.log({"type": "task", **task})

    def log_meeting(self, meeting: dict):
        """Log a meeting creation."""
        self.log({"type": "meeting", **meeting})

    def log_document(self, doc_type: str, title: str):
        """Log a document generation event."""
        self.log({"type": "document", "doc_type": doc_type, "title": title})

    def get_logs(self, date: str = None) -> list[dict]:
        """Retrieve logs for a specific date (default: today)."""
        if not date:
            date = datetime.utcnow().strftime("%Y-%m-%d")
        log_file = self.log_dir / f"conversations_{date}.jsonl"
        if not log_file.exists():
            return []
        entries = []
        with open(log_file, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line:
                    try:
                        entries.append(json.loads(line))
                    except json.JSONDecodeError:
                        pass
        return entries

    def list_log_dates(self) -> list[str]:
        """List all dates for which logs exist."""
        files = sorted(self.log_dir.glob("conversations_*.jsonl"), reverse=True)
        return [f.stem.replace("conversations_", "") for f in files]

    def get_summary(self) -> dict:
        """Return a summary of logged data."""
        dates = self.list_log_dates()
        total_entries = 0
        for date in dates[:30]:
            total_entries += len(self.get_logs(date))
        return {
            "total_days": len(dates),
            "total_entries": total_entries,
            "log_dir": str(self.log_dir),
            "latest_date": dates[0] if dates else None,
        }
