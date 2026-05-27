"""
GPU Processor — offloads heavy AI tasks to the laptop's GPU.
Supports: Whisper transcription, local LLM inference (via Ollama), image processing.
"""

import asyncio
import logging
import subprocess
from typing import Optional

logger = logging.getLogger("aria-agent.gpu")


class GPUProcessor:
    def __init__(self):
        self.has_cuda = self._check_cuda()
        self.has_metal = self._check_metal()
        self.has_ollama = self._check_ollama()
        logger.info(f"GPU: CUDA={self.has_cuda}, Metal={self.has_metal}, Ollama={self.has_ollama}")

    def _check_cuda(self) -> bool:
        try:
            import torch
            return torch.cuda.is_available()
        except ImportError:
            return False

    def _check_metal(self) -> bool:
        try:
            import torch
            return torch.backends.mps.is_available()
        except Exception:
            return False

    def _check_ollama(self) -> bool:
        try:
            result = subprocess.run(["ollama", "list"], capture_output=True, timeout=3)
            return result.returncode == 0
        except Exception:
            return False

    async def transcribe_audio(self, audio_path: str, model: str = "base") -> dict:
        """Transcribe audio using local Whisper on GPU."""
        try:
            import whisper
            device = "cuda" if self.has_cuda else "mps" if self.has_metal else "cpu"

            def _transcribe():
                m = whisper.load_model(model, device=device)
                return m.transcribe(audio_path)

            result = await asyncio.to_thread(_transcribe)
            return {
                "text": result.get("text", ""),
                "language": result.get("language", "en"),
                "gpu_used": device != "cpu",
                "device": device,
            }
        except ImportError:
            return {"error": "Whisper not installed. Run: pip install openai-whisper", "gpu_used": False}
        except Exception as e:
            return {"error": str(e), "gpu_used": False}

    async def run_ollama(self, prompt: str, model: str = "llama3") -> dict:
        """Run inference using local Ollama model."""
        if not self.has_ollama:
            return {"error": "Ollama not installed or not running"}
        try:
            result = await asyncio.to_thread(
                subprocess.run,
                ["ollama", "run", model, prompt],
                capture_output=True,
                text=True,
                timeout=120,
            )
            return {"text": result.stdout, "model": model, "gpu_used": True}
        except Exception as e:
            return {"error": str(e)}

    async def get_status(self) -> dict:
        status = {
            "cuda_available": self.has_cuda,
            "metal_available": self.has_metal,
            "ollama_available": self.has_ollama,
        }
        if self.has_cuda:
            try:
                import torch
                status["gpu_name"] = torch.cuda.get_device_name(0)
                status["gpu_memory_gb"] = round(torch.cuda.get_device_properties(0).total_memory / 1e9, 1)
            except Exception:
                pass
        return status
