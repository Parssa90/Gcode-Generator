"""
Text-to-Speech for ARIA using Azure Cognitive Services.

When someone calls ARIA's name in a Teams meeting chat,
ARIA responds with both text AND an audio message.

Note on real-time audio in Teams:
  True real-time audio (bot speaks INTO the call audio) requires the
  Microsoft Real-Time Media Platform SDK, which is C#-only and needs
  a Windows Azure VM. That is not feasible in our Python stack.

  What we DO here instead:
  - ARIA detects its name in meeting chat messages
  - Generates a spoken audio reply via Azure TTS
  - Posts the audio as a WAV file card in the Teams chat
  - Participants click play — or ARIA posts the transcribed text reply

  This covers the practical use case: calling "ARIA, what were the
  action items?" gets an instant spoken + written answer in the chat.
"""

import asyncio
import logging
import os
import tempfile
from typing import Optional

logger = logging.getLogger("aria.tts")

# ── Azure Speech SDK ───────────────────────────────────────────────────────────

def _get_speech_config():
    """Build Azure Speech config from environment."""
    try:
        import azure.cognitiveservices.speech as speechsdk
        from config import settings

        key = settings.azure_speech_key
        region = settings.azure_speech_region

        if not key or not region:
            return None, None

        config = speechsdk.SpeechConfig(subscription=key, region=region)
        config.speech_synthesis_voice_name = "en-US-AriaNeural"  # Named "Aria" — fitting!
        return config, speechsdk
    except ImportError:
        logger.warning("azure-cognitiveservices-speech not installed")
        return None, None


async def text_to_speech(text: str, output_path: Optional[str] = None) -> Optional[str]:
    """
    Convert text to speech using Azure Cognitive Services.
    Returns the path to the generated WAV file, or None on failure.

    Uses the 'en-US-AriaNeural' voice — a coincidence that it's named Aria!
    """
    config, speechsdk = _get_speech_config()
    if not config:
        logger.info("Azure Speech not configured — TTS skipped")
        return None

    if not output_path:
        tmp = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
        output_path = tmp.name
        tmp.close()

    def _synthesize():
        audio_config = speechsdk.audio.AudioOutputConfig(filename=output_path)
        synthesizer = speechsdk.SpeechSynthesizer(
            speech_config=config, audio_config=audio_config
        )
        result = synthesizer.speak_text_async(text).get()

        if result.reason == speechsdk.ResultReason.SynthesizingAudioCompleted:
            return output_path
        else:
            cancellation = result.cancellation_details
            logger.error(f"TTS failed: {cancellation.reason} — {cancellation.error_details}")
            return None

    try:
        path = await asyncio.to_thread(_synthesize)
        if path and os.path.exists(path):
            size_kb = os.path.getsize(path) // 1024
            logger.info(f"TTS generated: {path} ({size_kb} KB)")
        return path
    except Exception as e:
        logger.error(f"TTS error: {e}")
        return None


async def text_to_speech_bytes(text: str) -> Optional[bytes]:
    """
    Convert text to speech and return raw WAV bytes.
    Useful for in-memory handling without writing to disk.
    """
    config, speechsdk = _get_speech_config()
    if not config:
        return None

    def _synthesize():
        stream = speechsdk.audio.AudioOutputStream.create_pull_stream()
        audio_config = speechsdk.audio.AudioOutputConfig(stream=stream)
        synth = speechsdk.SpeechSynthesizer(speech_config=config, audio_config=audio_config)
        result = synth.speak_text_async(text).get()
        if result.reason == speechsdk.ResultReason.SynthesizingAudioCompleted:
            return result.audio_data
        return None

    try:
        return await asyncio.to_thread(_synthesize)
    except Exception as e:
        logger.error(f"TTS bytes error: {e}")
        return None


def is_configured() -> bool:
    """Return True if Azure Speech credentials are set."""
    try:
        from config import settings
        return bool(settings.azure_speech_key and settings.azure_speech_region)
    except Exception:
        return False
