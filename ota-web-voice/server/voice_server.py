"""
Voice server: Whisper Large v3 Turbo (STT) + F5-TTS (TTS)
Runs on port 8999 alongside the Express proxy.
"""
import io
import os
import time
import logging
import warnings
import tempfile

import numpy as np
import torch
import soundfile as sf

# ── Monkey-patch torchaudio.load to use soundfile ─────────────
# torchaudio 2.10 tries torchcodec which fails on aarch64
import torchaudio as _ta
_orig_ta_load = _ta.load


def _soundfile_load(filepath, *args, **kwargs):
    try:
        return _orig_ta_load(filepath, *args, **kwargs)
    except (ImportError, OSError, RuntimeError):
        data, sr = sf.read(filepath)
        if data.ndim == 1:
            data = data[np.newaxis, :]
        else:
            data = data.T
        return torch.from_numpy(data.astype(np.float32)), sr


_ta.load = _soundfile_load

# ── Now import ML libs ────────────────────────────────────────
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.responses import StreamingResponse, JSONResponse
from transformers import AutoModelForSpeechSeq2Seq, AutoProcessor, pipeline as hf_pipeline
from f5_tts.api import F5TTS

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("voice-server")

app = FastAPI(title="Voice Server")

# ── Config ─────────────────────────────────────────────────────
DEVICE = "cuda:0" if torch.cuda.is_available() else "cpu"
DTYPE = torch.float16 if DEVICE.startswith("cuda") else torch.float32
F5_REF_AUDIO = os.path.join(
    os.path.dirname(__file__),
    "../venvs/vllm/lib/python3.12/site-packages/f5_tts/infer/examples/basic/basic_ref_en.wav",
)
# Try multiple paths for the reference audio
for p in [
    os.path.expanduser("~/venvs/vllm/lib/python3.12/site-packages/f5_tts/infer/examples/basic/basic_ref_en.wav"),
    F5_REF_AUDIO,
]:
    if os.path.exists(p):
        F5_REF_AUDIO = p
        break

whisper_pipe = None
f5_model = None


def load_whisper():
    global whisper_pipe
    if whisper_pipe is not None:
        return
    logger.info("Loading Whisper Large v3 Turbo on %s ...", DEVICE)
    model_id = "openai/whisper-large-v3-turbo"
    model = AutoModelForSpeechSeq2Seq.from_pretrained(
        model_id, torch_dtype=DTYPE, low_cpu_mem_usage=True, use_safetensors=True,
    )
    model.to(DEVICE)
    processor = AutoProcessor.from_pretrained(model_id)
    whisper_pipe = hf_pipeline(
        "automatic-speech-recognition",
        model=model,
        tokenizer=processor.tokenizer,
        feature_extractor=processor.feature_extractor,
        torch_dtype=DTYPE,
        device=DEVICE,
        chunk_length_s=30,
        batch_size=1,
    )
    logger.info("Whisper loaded ✓")


def load_f5tts():
    global f5_model
    if f5_model is not None:
        return
    logger.info("Loading F5-TTS on %s ...", DEVICE)
    f5_model = F5TTS(model="F5TTS_v1_Base", ckpt_file="", vocab_file="", device=DEVICE)
    logger.info("F5-TTS loaded ✓ (ref audio: %s)", F5_REF_AUDIO)


@app.on_event("startup")
async def startup():
    load_whisper()
    load_f5tts()
    logger.info("🟢 Voice server ready on %s", DEVICE)


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "device": DEVICE,
        "whisper_loaded": whisper_pipe is not None,
        "f5tts_loaded": f5_model is not None,
    }


@app.post("/stt")
async def transcribe(audio: UploadFile = File(...)):
    """Accept audio file (webm/wav/ogg), return transcript text."""
    t0 = time.time()
    raw = await audio.read()
    logger.info("[/stt] Received %d bytes (%s)", len(raw), audio.content_type)

    # Write to temp file, then convert to wav via ffmpeg if needed
    suffix = ".webm"
    ct = audio.content_type or ""
    if "wav" in ct or "wav" in (audio.filename or ""):
        suffix = ".wav"
    elif "ogg" in ct or "opus" in ct:
        suffix = ".ogg"

    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(raw)
        tmp_path = tmp.name

    try:
        # soundfile can't read webm/opus — convert to wav with ffmpeg
        if suffix == ".webm":
            wav_path = tmp_path.replace(".webm", ".wav")
            import subprocess
            result = subprocess.run(
                ["ffmpeg", "-y", "-i", tmp_path, "-ar", "16000", "-ac", "1", "-f", "wav", wav_path],
                capture_output=True, timeout=10,
            )
            if result.returncode != 0:
                logger.error("ffmpeg failed: %s", result.stderr.decode()[-200:])
                raise RuntimeError("ffmpeg conversion failed")
            os.unlink(tmp_path)
            tmp_path = wav_path

        data, sr = sf.read(tmp_path)
        if data.ndim > 1:
            data = data.mean(axis=1)
        data = data.astype(np.float32)
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)

    # Note: ffmpeg already resamples webm to 16kHz; only resample wav/ogg if needed
    if sr != 16000:
        import librosa
        data = librosa.resample(data, orig_sr=int(sr), target_sr=16000)
        sr = 16000

    # Run Whisper
    result = whisper_pipe(data, generate_kwargs={"language": "en"})
    transcript = result["text"].strip()
    elapsed = time.time() - t0
    logger.info("[/stt] %.2fs → %s", elapsed, transcript[:120])

    return JSONResponse({"transcript": transcript, "elapsed_s": round(elapsed, 2)})


@app.post("/tts")
async def synthesize(text: str = Form(...)):
    """Accept text, return WAV audio."""
    t0 = time.time()
    logger.info("[/tts] Synthesizing: %s", text[:120])

    audio, sr, _ = f5_model.infer(
        ref_file=F5_REF_AUDIO,
        ref_text="",
        gen_text=text,
    )

    # Encode to WAV in memory
    buf = io.BytesIO()
    sf.write(buf, audio.squeeze(), sr, format="WAV", subtype="PCM_16")
    buf.seek(0)

    duration = len(audio.squeeze()) / sr
    elapsed = time.time() - t0
    logger.info("[/tts] %.2fs audio in %.2fs", duration, elapsed)

    return StreamingResponse(
        buf,
        media_type="audio/wav",
        headers={"X-Duration-S": str(round(duration, 2))},
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8999, log_level="info")
