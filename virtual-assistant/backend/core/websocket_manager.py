import asyncio
import json
import logging
from typing import Optional
import websockets
from websockets.server import WebSocketServerProtocol
from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ClientManager:
    """Manages WebSocket connections from browser clients."""

    def __init__(self):
        self.clients: set[WebSocket] = set()

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.clients.add(ws)

    def disconnect(self, ws: WebSocket):
        self.clients.discard(ws)

    async def broadcast(self, message_type: str, data: dict):
        if not self.clients:
            return
        msg = json.dumps({"type": message_type, "data": data})
        dead = set()
        for ws in self.clients:
            try:
                await ws.send_text(msg)
            except Exception:
                dead.add(ws)
        self.clients -= dead

    async def send(self, ws: WebSocket, message_type: str, data: dict):
        try:
            await ws.send_text(json.dumps({"type": message_type, "data": data}))
        except Exception:
            self.disconnect(ws)


client_manager = ClientManager()


class LaptopAgentBridge:
    """Bridges communication between the web server and the laptop agent."""

    def __init__(self):
        self.ws: Optional[websockets.WebSocketClientProtocol] = None
        self.connected = False
        self.laptop_info: dict = {}
        self._reconnect_task: Optional[asyncio.Task] = None

    async def connect(self, url: str):
        try:
            self.ws = await websockets.connect(url, ping_interval=20, ping_timeout=10)
            self.connected = True
            logger.info(f"Connected to laptop agent at {url}")
            await client_manager.broadcast("laptop_status", {"connected": True, **self.laptop_info})
            asyncio.create_task(self._listen())
            return True
        except Exception as e:
            logger.warning(f"Could not connect to laptop agent: {e}")
            self.connected = False
            return False

    async def _listen(self):
        try:
            async for message in self.ws:
                try:
                    data = json.loads(message)
                    await self._handle_laptop_message(data)
                except Exception:
                    pass
        except Exception:
            pass
        finally:
            self.connected = False
            self.ws = None
            await client_manager.broadcast("laptop_status", {"connected": False})

    async def _handle_laptop_message(self, data: dict):
        msg_type = data.get("type")
        if msg_type == "status":
            self.laptop_info = data.get("data", {})
            await client_manager.broadcast("laptop_status", {"connected": True, **self.laptop_info})
        elif msg_type == "file_content":
            await client_manager.broadcast("file_content", data.get("data", {}))
        elif msg_type == "task_result":
            await client_manager.broadcast("task_result", data.get("data", {}))

    async def send(self, message_type: str, data: dict) -> bool:
        if not self.connected or not self.ws:
            return False
        try:
            await self.ws.send(json.dumps({"type": message_type, "data": data}))
            return True
        except Exception:
            self.connected = False
            return False

    async def read_file(self, path: str) -> Optional[str]:
        if not await self.send("read_file", {"path": path}):
            return None
        return None

    async def write_file(self, path: str, content: str) -> bool:
        return await self.send("write_file", {"path": path, "content": content})

    async def list_dir(self, directory: str) -> dict:
        if not await self.send("list_dir", {"path": directory}):
            return {"files": [], "dirs": []}
        return {"files": [], "dirs": []}

    async def sync_task(self, task: dict) -> bool:
        return await self.send("sync_task", {"task": task})


laptop_bridge = LaptopAgentBridge()
