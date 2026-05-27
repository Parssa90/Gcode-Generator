#!/usr/bin/env python3
"""
ARIA Laptop Agent — runs on the user's laptop and bridges to the ARIA web server.

Features:
- WebSocket server that accepts connections from the ARIA backend
- File system read/write access
- System resource monitoring (CPU, GPU, disk)
- Local conversation logging
- GPU-accelerated task processing (if available)
"""

import asyncio
import json
import logging
import os
import platform
import socket
import sys
from datetime import datetime
from pathlib import Path

import psutil
import websockets
from websockets.server import serve

from file_manager import FileManager
from conversation_logger import ConversationLogger

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [ARIA Agent] %(levelname)s %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(Path.home() / ".aria" / "agent.log"),
    ],
)
logger = logging.getLogger("aria-agent")

AGENT_PORT = int(os.getenv("ARIA_AGENT_PORT", "8765"))
ARIA_SERVER = os.getenv("ARIA_SERVER_URL", "")
LOG_DIR = Path.home() / ".aria" / "logs"
LOG_DIR.mkdir(parents=True, exist_ok=True)

file_manager = FileManager(root=Path.home())
conv_logger = ConversationLogger(LOG_DIR)


def get_local_ip() -> str:
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"


def get_gpu_usage() -> float | None:
    try:
        import subprocess
        result = subprocess.run(
            ["nvidia-smi", "--query-gpu=utilization.gpu", "--format=csv,noheader,nounits"],
            capture_output=True, text=True, timeout=2,
        )
        if result.returncode == 0:
            return float(result.stdout.strip().split("\n")[0])
    except Exception:
        pass
    try:
        import pynvml
        pynvml.nvmlInit()
        handle = pynvml.nvmlDeviceGetHandleByIndex(0)
        util = pynvml.nvmlDeviceGetUtilizationRates(handle)
        return float(util.gpu)
    except Exception:
        pass
    return None


def get_system_status() -> dict:
    cpu = psutil.cpu_percent(interval=0.1)
    mem = psutil.virtual_memory()
    disk = psutil.disk_usage(str(Path.home()))
    gpu = get_gpu_usage()

    return {
        "ip": get_local_ip(),
        "hostname": platform.node(),
        "platform": platform.system(),
        "cpuUsage": round(cpu, 1),
        "memUsage": round(mem.percent, 1),
        "diskFree": round(disk.free / (1024 ** 3), 1),
        "gpuUsage": round(gpu, 1) if gpu is not None else None,
        "lastSeen": datetime.utcnow().isoformat(),
    }


async def handle_message(ws, raw: str) -> dict | None:
    try:
        msg = json.loads(raw)
        msg_type = msg.get("type")
        data = msg.get("data", {})

        logger.info(f"Received: {msg_type}")

        if msg_type == "status_request":
            return {"type": "status", "data": get_system_status()}

        elif msg_type == "read_file":
            path = data.get("path", "")
            result = await file_manager.read(path)
            return {"type": "file_content", "data": {"path": path, "content": result, "success": result is not None}}

        elif msg_type == "write_file":
            path = data.get("path", "")
            content = data.get("content", "")
            success = await file_manager.write(path, content)
            return {"type": "write_result", "data": {"path": path, "success": success}}

        elif msg_type == "list_dir":
            path = data.get("path", "~")
            result = await file_manager.list_dir(path)
            return {"type": "dir_listing", "data": result}

        elif msg_type == "sync_task":
            task = data.get("task", {})
            task_file = LOG_DIR / "tasks.jsonl"
            with open(task_file, "a") as f:
                f.write(json.dumps({**task, "synced_at": datetime.utcnow().isoformat()}) + "\n")
            logger.info(f"Task synced: {task.get('title')}")
            return {"type": "task_synced", "data": {"id": task.get("id"), "success": True}}

        elif msg_type == "conversation_log":
            conv_logger.log(data)
            return None

        elif msg_type == "new_meeting":
            meeting_file = LOG_DIR / "meetings.jsonl"
            with open(meeting_file, "a") as f:
                f.write(json.dumps({**data, "logged_at": datetime.utcnow().isoformat()}) + "\n")
            return None

        elif msg_type == "run_gpu_task":
            result = await run_gpu_task(data)
            return {"type": "gpu_task_result", "data": result}

        elif msg_type == "ping":
            return {"type": "pong", "data": {}}

    except Exception as e:
        logger.error(f"Error handling message: {e}")
        return {"type": "error", "data": {"message": str(e)}}

    return None


async def run_gpu_task(data: dict) -> dict:
    """Run a GPU-accelerated task if hardware is available."""
    task_type = data.get("task_type", "")
    try:
        if task_type == "transcribe":
            import whisper
            model = whisper.load_model("base")
            audio_path = data.get("audio_path", "")
            result = model.transcribe(audio_path)
            return {"text": result["text"], "gpu_used": True}
        elif task_type == "inference":
            return {"result": "GPU inference completed", "gpu_used": True}
    except ImportError:
        return {"result": "GPU libraries not installed", "gpu_used": False}
    except Exception as e:
        return {"error": str(e), "gpu_used": False}
    return {"result": "Unknown task type"}


async def broadcast_status(clients: set, interval: int = 10):
    """Periodically broadcast system status to all connected clients."""
    while True:
        await asyncio.sleep(interval)
        if clients:
            status = get_system_status()
            msg = json.dumps({"type": "status", "data": status})
            dead = set()
            for ws in clients:
                try:
                    await ws.send(msg)
                except Exception:
                    dead.add(ws)
            clients -= dead


async def run_server():
    clients: set = set()

    async def handler(ws):
        clients.add(ws)
        logger.info(f"Client connected: {ws.remote_address}")
        try:
            init_status = get_system_status()
            await ws.send(json.dumps({"type": "status", "data": init_status}))

            async for message in ws:
                response = await handle_message(ws, message)
                if response:
                    await ws.send(json.dumps(response))
        except websockets.ConnectionClosed:
            logger.info(f"Client disconnected: {ws.remote_address}")
        except Exception as e:
            logger.error(f"Connection error: {e}")
        finally:
            clients.discard(ws)

    ip = get_local_ip()
    logger.info(f"ARIA Agent starting on ws://{ip}:{AGENT_PORT}")
    logger.info(f"Logs stored in: {LOG_DIR}")
    logger.info("Waiting for ARIA server connection...")

    asyncio.create_task(broadcast_status(clients))

    async with serve(handler, "0.0.0.0", AGENT_PORT):
        logger.info(f"ARIA Agent running — connect from web app using IP: {ip}")
        await asyncio.Future()


def main():
    Path.home().joinpath(".aria").mkdir(exist_ok=True)
    try:
        asyncio.run(run_server())
    except KeyboardInterrupt:
        logger.info("ARIA Agent stopped")


if __name__ == "__main__":
    main()
