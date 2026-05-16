const express = require('express');
const cors = require('cors');
const http = require('http');
const { WebSocket, WebSocketServer } = require('ws');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const PORT = 3001;
const LM_STUDIO_URL = 'http://localhost:1234/v1/chat/completions';
const MODEL = 'qwen/qwen3.5-9b';
const VOICE_SERVER = 'http://localhost:8999';

app.use(cors());
app.use(express.json());

// Multer for file uploads (audio blobs)
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Text chat (LLM via LM Studio) ────────────────────────────
app.post('/api/chat', async (req, res) => {
  console.log('[/api/chat] Request received');
  try {
    const { messages } = req.body;
    const chatMessages = (messages || []).map(m => ({ role: m.role, content: m.content }));
    if (!chatMessages.some(m => m.role === 'system')) {
      chatMessages.unshift({
        role: 'system',
        content: 'You are a helpful AI hotel concierge. Answer questions concisely in 2-3 sentences. Be friendly and informative.'
      });
    }

    const llmResponse = await fetch(LM_STUDIO_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        messages: chatMessages,
        max_tokens: 800,
        temperature: 0.7,
        reasoning_effort: 'none',
      }),
    });

    if (!llmResponse.ok) {
      const errText = await llmResponse.text();
      console.error('[/api/chat] LM Studio error:', errText.substring(0, 500));
      return res.status(502).json({ error: 'LM Studio error', details: errText.substring(0, 200) });
    }

    const data = await llmResponse.json();
    if (data.choices && data.choices[0] && data.choices[0].message) {
      const content = (data.choices[0].message.content || '').trim();
      return res.json({ content });
    }
    res.json(data);
  } catch (error) {
    console.error('[/api/chat] ERROR:', error.message);
    res.status(500).json({ error: 'Failed to get AI response', details: error.message });
  }
});

// ── Voice STT: proxy to Python voice server ──────────────────
app.post('/api/voice/stt', upload.single('audio'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No audio file provided' });
  }
  console.log(`[/api/voice/stt] Received ${req.file.size} bytes (${req.file.mimetype})`);

  try {
    // Use native FormData + Blob (Node 20+) — npm form-data streams
    // don't work with built-in fetch, causing boundary parse errors
    const blob = new Blob([req.file.buffer], { type: req.file.mimetype || 'audio/webm' });
    const form = new FormData();
    form.append('audio', blob, req.file.originalname || 'audio.webm');

    const voiceRes = await fetch(`${VOICE_SERVER}/stt`, {
      method: 'POST',
      body: form,
    });

    if (!voiceRes.ok) {
      const err = await voiceRes.text();
      console.error('[/api/voice/stt] Voice server error:', err);
      return res.status(502).json({ error: 'STT failed', details: err });
    }

    const result = await voiceRes.json();
    console.log('[/api/voice/stt] Transcript:', result.transcript);
    res.json(result);
  } catch (error) {
    console.error('[/api/voice/stt] ERROR:', error.message);
    res.status(500).json({ error: 'STT proxy failed', details: error.message });
  }
});

// ── Voice TTS: proxy to Python voice server ──────────────────
app.post('/api/voice/tts', express.text({ type: '*/*' }), async (req, res) => {
  const text = req.body;
  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'No text provided' });
  }
  console.log('[/api/voice/tts] Synthesizing:', text.substring(0, 100));

  try {
    const params = new URLSearchParams();
    params.append('text', text);

    const voiceRes = await fetch(`${VOICE_SERVER}/tts`, {
      method: 'POST',
      body: params,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    if (!voiceRes.ok) {
      const err = await voiceRes.text();
      console.error('[/api/voice/tts] Voice server error:', err);
      return res.status(502).json({ error: 'TTS failed', details: err });
    }

    // Stream the WAV audio back
    res.setHeader('Content-Type', 'audio/wav');
    res.setHeader('X-Duration-S', voiceRes.headers.get('X-Duration-S') || '0');
    const buf = await voiceRes.arrayBuffer();
    res.send(Buffer.from(buf));
    console.log('[/api/voice/tts] Sent', buf.byteLength, 'bytes');
  } catch (error) {
    console.error('[/api/voice/tts] ERROR:', error.message);
    res.status(500).json({ error: 'TTS proxy failed', details: error.message });
  }
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`STT proxy: POST /api/voice/stt → ${VOICE_SERVER}/stt`);
  console.log(`TTS proxy: POST /api/voice/tts → ${VOICE_SERVER}/tts`);
});
