import os
import asyncio
from pathlib import Path
from typing import Optional


class FileManager:
    """Safe file system access for the laptop agent."""

    def __init__(self, root: Path = Path.home()):
        self.root = root.expanduser().resolve()

    def _resolve(self, path: str) -> Optional[Path]:
        """Resolve path safely, preventing directory traversal."""
        expanded = Path(path).expanduser()
        if not expanded.is_absolute():
            expanded = self.root / expanded
        resolved = expanded.resolve()
        if not str(resolved).startswith(str(self.root)):
            return None
        return resolved

    async def read(self, path: str) -> Optional[str]:
        resolved = self._resolve(path)
        if not resolved or not resolved.exists() or not resolved.is_file():
            return None
        size = resolved.stat().st_size
        if size > 10 * 1024 * 1024:
            return f"[File too large: {size // (1024*1024)} MB — use a specific byte range]"
        try:
            return await asyncio.to_thread(resolved.read_text, errors="replace")
        except Exception as e:
            return f"[Error reading file: {e}]"

    async def write(self, path: str, content: str) -> bool:
        resolved = self._resolve(path)
        if not resolved:
            return False
        try:
            resolved.parent.mkdir(parents=True, exist_ok=True)
            await asyncio.to_thread(resolved.write_text, content)
            return True
        except Exception:
            return False

    async def list_dir(self, path: str) -> dict:
        expanded = path.replace("~", str(Path.home()))
        resolved = Path(expanded).expanduser().resolve()
        if not resolved.exists() or not resolved.is_dir():
            return {"files": [], "dirs": [], "error": "Directory not found"}

        try:
            entries = await asyncio.to_thread(lambda: list(resolved.iterdir()))
            files = sorted([e.name for e in entries if e.is_file() and not e.name.startswith(".")])
            dirs = sorted([e.name for e in entries if e.is_dir() and not e.name.startswith(".")])
            return {"files": files[:100], "dirs": dirs[:50], "path": str(resolved)}
        except PermissionError:
            return {"files": [], "dirs": [], "error": "Permission denied"}

    async def exists(self, path: str) -> bool:
        resolved = self._resolve(path)
        return resolved is not None and resolved.exists()

    async def delete(self, path: str) -> bool:
        resolved = self._resolve(path)
        if not resolved or not resolved.exists():
            return False
        try:
            if resolved.is_file():
                resolved.unlink()
            return True
        except Exception:
            return False
