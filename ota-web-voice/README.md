# OTA Web Voice 🎙️

Voice-enabled hotel booking app with real-time voice Q&A powered by local AI models.

## Architecture

```
Browser (mic) → Express proxy → FastAPI voice server (CUDA)
                                  ├── Whisper Large v3 Turbo (STT)
                                  └── F5-TTS (TTS)
                              → LM Studio (Qwen3.5-9B LLM)
```

**Voice Pipeline:**
1. 🎤 MediaRecorder captures audio (WebM/Opus)
2. FFmpeg converts to 16kHz WAV
3. Whisper transcribes speech → text
4. Qwen3.5 generates property-aware response
5. F5-TTS synthesizes response → WAV audio
6. Browser plays audio back

## Tech Stack

- **Frontend:** React 19, Vite, TypeScript, Tailwind CSS
- **Backend:** Express.js (proxy), FastAPI + Uvicorn (voice server)
- **STT:** OpenAI Whisper Large v3 Turbo (Hugging Face Transformers)
- **LLM:** Qwen3.5-9B via LM Studio
- **TTS:** F5-TTS v1 Base (zero-shot voice cloning)
- **Inference:** CUDA on NVIDIA DGX Spark (Grace Blackwell GB10)

## Setup

```bash
# Install dependencies
npm install

# Start voice server (Python, CUDA)
python server/voice_server.py  # port 8999

# Start Express proxy
node server/index.cjs           # port 3001

# Start Vite dev server
npx vite --host 0.0.0.0        # port 5173 (HTTPS)
```

## Features

- 🔍 Hotel search with mock property data
- 💬 Text-based AI concierge chat
- 🎤 Voice Q&A — ask questions by speaking
- 📝 Transcribed queries shown in chat window
- 🔊 AI responses spoken aloud
- 🏨 Multi-step booking flow
