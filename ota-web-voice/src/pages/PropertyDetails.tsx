import { useParams, useNavigate } from 'react-router-dom';
import mockData from '../data/mockData.json';
import { useBookingContext } from '../context/BookingContext';
import { Star, MapPin, Users, Check, ShieldCheck, Utensils, Bed, Send, ChevronLeft, ChevronRight, Mic, MicOff, Loader2 } from 'lucide-react';
import { useState, useRef, useEffect, useCallback } from 'react';

const PropertyDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const { setSelectedRoom, searchCriteria } = useBookingContext();
  const [askInput, setAskInput] = useState('');
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'assistant'; text: string }[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<'idle' | 'recording' | 'transcribing' | 'thinking' | 'speaking' | 'error'>('idle');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // ── Resolve property first ──────────────────────────────────
  const property = mockData.find((p) => p.id === id);
  if (!property) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--primary-color)', fontFamily: 'system-ui, sans-serif' } as React.CSSProperties}>
        Property not found
      </div>
    );
  }

  const handleReserve = (room: typeof property.rooms[0]) => {
    setSelectedRoom(room);
    navigate('/book');
  };

  const nextImage = () => setCurrentImageIndex((prev) => (prev + 1) % property.images.length);

  const systemPrompt = `You are an AI concierge for the property "${property.name}" located at "${property.location}". 
Description: ${property.description}. 
Amenities: ${property.amenities.join(', ')}. 
Answer the user's question concisely and helpfully based on this information.`;

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, isTyping]);

  // ── Text chat ───────────────────────────────────────────────
  const handleAskQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedInput = askInput.trim();
    if (!trimmedInput) return;

    setChatHistory((prev) => [...prev, { role: 'user', text: trimmedInput }]);
    setIsTyping(true);
    setAskInput('');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gemma-4',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: trimmedInput }
          ]
        })
      });

      const data = await response.json();
      let reply = (data.content || '').trim();
      if (!reply) reply = "I'm sorry, I couldn't generate a response. Please try again.";
      setChatHistory((prev) => [...prev, { role: 'assistant', text: reply }]);
    } catch (error) {
      console.error('Error fetching AI response:', error);
      setChatHistory((prev) => [...prev, { role: 'assistant', text: 'Sorry, I encountered an error. Please try again.' }]);
    } finally {
      setIsTyping(false);
    }
  };

  // ── Voice pipeline: Record → STT → LLM → TTS → Play ────────
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
    }
    setIsRecording(false);
  }, []);

  const handleToggleRecording = useCallback(async () => {
    if (isRecording) {
      stopRecording();
      return;
    }

    try {
      // 1. Get mic access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { sampleRate: 16000, channelCount: 1, echoCancellation: true, noiseSuppression: true },
      });
      mediaStreamRef.current = stream;

      // 2. Set up MediaRecorder
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        // Stop mic tracks
        stream.getTracks().forEach(t => t.stop());
        mediaStreamRef.current = null;

        // 3. Create audio blob and send to STT
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        if (audioBlob.size < 1000) {
          setVoiceStatus('idle');
          return; // Too short, ignore
        }

        setVoiceStatus('transcribing');

        try {
          // ── STT: Send audio to Whisper ───────────────────────
          const formData = new FormData();
          formData.append('audio', audioBlob, 'recording.webm');

          const sttRes = await fetch('/api/voice/stt', { method: 'POST', body: formData });
          if (!sttRes.ok) throw new Error('STT failed');
          const { transcript } = await sttRes.json();

          if (!transcript || !transcript.trim()) {
            setChatHistory((prev) => [...prev, { role: 'assistant', text: "I couldn't hear you clearly. Please try again." }]);
            setVoiceStatus('idle');
            return;
          }

          // Show user's transcribed text in chat
          setChatHistory((prev) => [...prev, { role: 'user', text: `🎤 "${transcript}"` }]);

          // ── LLM: Get response with property context ──────────
          setVoiceStatus('thinking');
          const llmRes = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: 'gemma-4',
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: transcript }
              ]
            })
          });
          const llmData = await llmRes.json();
          const reply = (llmData.content || "I'm sorry, I couldn't generate a response.").trim();

          // Show assistant response in chat
          setChatHistory((prev) => [...prev, { role: 'assistant', text: reply }]);

          // ── TTS: Synthesize response ─────────────────────────
          setVoiceStatus('speaking');
          const ttsRes = await fetch('/api/voice/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: reply,
          });

          if (!ttsRes.ok) throw new Error('TTS failed');
          const audioData = await ttsRes.arrayBuffer();

          // Play the audio
          const audioBlob2 = new Blob([audioData], { type: 'audio/wav' });
          const audioUrl = URL.createObjectURL(audioBlob2);
          const audio = new Audio(audioUrl);
          audioRef.current = audio;
          audio.onended = () => {
            URL.revokeObjectURL(audioUrl);
            setVoiceStatus('idle');
          };
          audio.onerror = () => {
            URL.revokeObjectURL(audioUrl);
            setVoiceStatus('idle');
          };
          await audio.play();
        } catch (err) {
          console.error('Voice pipeline error:', err);
          setChatHistory((prev) => [...prev, { role: 'assistant', text: 'Sorry, there was an error processing your voice. Please try again.' }]);
          setVoiceStatus('idle');
        }
      };

      // Start recording
      recorder.start();
      setIsRecording(true);
      setVoiceStatus('recording');
    } catch (err) {
      console.error('Mic error:', err);
      setChatHistory((prev) => [...prev, { role: 'assistant', text: 'Could not access microphone. Please allow mic permissions and try again.' }]);
      setVoiceStatus('idle');
    }
  }, [isRecording, systemPrompt, stopRecording]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      if (mediaStreamRef.current) mediaStreamRef.current.getTracks().forEach(t => t.stop());
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    };
  }, []);

  // Voice status indicator text
  const voiceStatusMap: Record<string, { text: string; color: string }> = {
    idle: { text: '', color: '' },
    recording: { text: '🎙️ Recording… click to stop', color: '#dc2626' },
    transcribing: { text: '⏳ Transcribing…', color: '#f59e0b' },
    thinking: { text: '🧠 Thinking…', color: '#3b82f6' },
    speaking: { text: '🔊 Speaking…', color: '#10b981' },
    error: { text: '❌ Error', color: '#ef4444' },
  };
  const voiceIndicator = voiceStatusMap[voiceStatus] || voiceStatusMap.idle;

  const styles = {
    container: { maxWidth: '1200px', margin: '0 auto', padding: '2rem', fontFamily: "'Inter', system-ui, sans-serif" },
    header: { marginBottom: '2rem' },
    badge: { background: 'var(--accent-color)', color: 'var(--bg-card)', padding: '0.25rem 0.75rem', borderRadius: '4px', fontSize: '0.875rem', fontWeight: '600', display: 'inline-block', marginBottom: '0.5rem' },
    title: { fontSize: '2.25rem', fontWeight: '700', color: 'var(--primary-color)', margin: '0.5rem 0' },
    location: { display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#555', marginBottom: '0.5rem' },
    rating: { display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--accent-color)', fontWeight: '600', fontSize: '1.1rem' },
    section: { marginBottom: '2.5rem' },
    sectionTitle: { fontSize: '1.5rem', fontWeight: '600', color: 'var(--primary-color)', marginBottom: '1rem' },
    amenities: { display: 'flex', flexWrap: 'wrap', gap: '1rem' },
    amenityItem: { display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#333', fontSize: '0.95rem' },
    roomCard: { border: '1px solid #e0e0e0', borderRadius: '8px', padding: '1.5rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fafafa' },
    reserveBtn: { background: 'var(--primary-color)', color: 'var(--bg-card)', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '4px', cursor: 'pointer', fontWeight: '600', transition: 'background 0.2s' },
    review: { borderBottom: '1px solid #eee', paddingBottom: '1rem', marginBottom: '1rem' },
    reviewAuthor: { fontWeight: '600', color: 'var(--primary-color)' },
    reviewDate: { color: '#777', fontSize: '0.875rem', marginBottom: '0.5rem' },
    layout: { display: 'flex', gap: '2rem', alignItems: 'flex-start' },
    mainContent: { flex: '1' },
    sidebar: { width: '320px', position: 'sticky', top: '2rem', background: 'var(--bg-card)', border: '1px solid #e0e0e0', borderRadius: '8px', padding: '1.5rem', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' },
    price: { fontSize: '1.75rem', fontWeight: '700', color: 'var(--primary-color)' },
    badgeGreen: { background: '#e6f4ea', color: '#1e7e34', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.875rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.5rem' },
    guarantee: { display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary-color)', fontWeight: '600', marginBottom: '1rem' },
    divider: { height: '1px', background: '#e0e0e0', margin: '1rem 0' },
    totalLabel: { fontSize: '0.875rem', color: '#555' },
  };

  return (
    <div style={styles.container}>
      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1); }
        }
        @keyframes pulse-red {
          0% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.6); }
          70% { box-shadow: 0 0 0 10px rgba(220, 38, 38, 0); }
          100% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
      <div style={styles.header}>
        <div style={styles.badge}>{property.propertyType}</div>
        <h1 style={styles.title}>{property.name}</h1>
        <div style={styles.location}>
          <MapPin size={18} />
          <span>{property.location}</span>
        </div>
        <div style={styles.rating}>
          {[...Array(5)].map((_, i) => (
            <Star key={i} size={18} fill={i < Math.floor(property.rating) ? 'var(--accent-color)' : '#e0e0e0'} stroke="#c5a059" />
          ))}
          <span style={{ marginLeft: '0.5rem', color: '#333' } as React.CSSProperties}>{property.rating} ({property.reviewsCount} reviews)</span>
        </div>
        <div style={{ ...styles.rating, marginTop: '0.25rem', color: '#555', fontSize: '0.9rem' } as React.CSSProperties}>
          <span>Located {property.distanceFromCenter} from center</span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', height: 'auto', marginBottom: '2rem' }}>
        <div style={{ position: 'relative', width: '100%', height: '400px', marginBottom: '0.5rem' }}>
          <img src={property.images[currentImageIndex]} alt="Property" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }} />
          {property.images.length > 1 && (
            <>
              <button onClick={() => setCurrentImageIndex((prev) => (prev - 1 + property.images.length) % property.images.length)} style={{ position: 'absolute', top: '50%', left: '0.75rem', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.8)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}><ChevronLeft size={20} /></button>
              <button onClick={nextImage} style={{ position: 'absolute', top: '50%', right: '0.75rem', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.8)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}><ChevronRight size={20} /></button>
            </>
          )}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
          {property.images.map((img, idx) => (
            <img key={idx} src={img} alt={`Property ${idx + 1}`} style={{ width: '80px', height: '60px', objectFit: 'cover', borderRadius: '4px', cursor: 'pointer', opacity: currentImageIndex === idx ? 1 : 0.6, border: currentImageIndex === idx ? '2px solid gold' : '2px solid transparent', flexShrink: 0 }} onClick={() => setCurrentImageIndex(idx)} />
          ))}
        </div>
      </div>

      <div style={styles.layout}>
        <div style={styles.mainContent}>
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>About this Property</h2>
            <p style={{ lineHeight: '1.6', color: '#333' } as React.CSSProperties}>{property.description}</p>
          </section>

          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>Premium Amenities</h2>
            <div style={styles.amenities}>
              {property.amenities.map((amenity, idx) => (
                <div key={idx} style={styles.amenityItem}>
                  <Check size={16} color="#c5a059" />
                  <span>{amenity}</span>
                </div>
              ))}
            </div>
          </section>

          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>Available Rooms</h2>
            {property.rooms.map((room) => (
              <div key={room.id} style={styles.roomCard}>
                <div>
                  <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--primary-color)' } as React.CSSProperties}>{room.name}</h3>
                  <div style={{ display: 'flex', gap: '1rem', color: '#555', fontSize: '0.9rem', marginBottom: '0.5rem' } as React.CSSProperties}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' } as React.CSSProperties}><Users size={14} /> {room.capacity} Guests</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' } as React.CSSProperties}><Bed size={14} /> {room.beds}</span>
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: '600', color: 'var(--primary-color)' } as React.CSSProperties}>
                    ${room.price}<span style={{ fontSize: '0.875rem', fontWeight: '400', color: '#555' } as React.CSSProperties}>/night</span>
                  </div>
                </div>
                <button style={styles.reserveBtn} onClick={() => handleReserve(room)}>Reserve</button>
              </div>
            ))}
          </section>

          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>Recent Reviews</h2>
            {property.reviews.map((review) => (
              <div key={review.id} style={styles.review}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' } as React.CSSProperties}>
                  <span style={styles.reviewAuthor}>{review.author}</span>
                  <div style={{ display: 'flex' } as React.CSSProperties}>
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={14} fill={i < parseInt(review.rating) ? 'var(--accent-color)' : '#e0e0e0'} stroke="#c5a059" />
                    ))}
                  </div>
                </div>
                <div style={styles.reviewDate}>{review.date}</div>
                <p style={{ margin: 0, color: '#333' } as React.CSSProperties}>{review.comment}</p>
              </div>
            ))}
          </section>

          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>Ask About This Property</h2>
            <div style={{ border: '1px solid #e0e0e0', borderRadius: '8px', overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '300px', background: 'var(--bg-card)' }}>
              <div style={{ flex: '1', overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {chatHistory.length === 0 && (
                  <div style={{ textAlign: 'center', color: '#777', padding: '1rem 0' }}>
                    Have a question? Ask about {property.name}...
                  </div>
                )}
                {chatHistory.map((msg, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                    <div style={{
                      maxWidth: '80%',
                      padding: '0.75rem 1rem',
                      borderRadius: '12px',
                      background: msg.role === 'user' ? 'var(--primary-color)' : '#f0f0f0',
                      color: msg.role === 'user' ? 'var(--bg-card)' : '#333',
                      fontSize: '0.95rem',
                      lineHeight: '1.4'
                    }}>
                      {msg.text}
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                    <div style={{ padding: '0.75rem 1rem', borderRadius: '12px', background: '#f0f0f0', display: 'flex', gap: '4px' }}>
                      <span style={{ animation: 'bounce 1.4s infinite ease-in-out both', fontSize: '1rem' }}>•</span>
                      <span style={{ animation: 'bounce 1.4s infinite ease-in-out both', animationDelay: '0.16s', fontSize: '1rem' }}>•</span>
                      <span style={{ animation: 'bounce 1.4s infinite ease-in-out both', animationDelay: '0.32s', fontSize: '1rem' }}>•</span>
                    </div>
                  </div>
                )}
                {voiceStatus !== 'idle' && voiceIndicator.text && (
                  <div style={{ textAlign: 'center', color: voiceIndicator.color, fontSize: '0.85rem', padding: '0.25rem', fontWeight: '500' }}>
                    {voiceIndicator.text}
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
              <form onSubmit={handleAskQuestion} style={{ padding: '0.75rem', borderTop: '1px solid #e0e0e0', display: 'flex', gap: '0.5rem', background: '#fafafa', alignItems: 'center' }}>
                <input
                  type="text"
                  value={askInput}
                  onChange={(e) => setAskInput(e.target.value)}
                  placeholder="Ask a question..."
                  style={{ flex: '1', height: '40px', padding: '0 0.8rem', border: '1px solid #ccc', borderRadius: '20px', outline: 'none', fontSize: '0.95rem' }}
                />
                <button
                  type="button"
                  onClick={handleToggleRecording}
                  title={isRecording ? 'Stop recording' : 'Start voice chat'}
                  disabled={voiceStatus === 'transcribing' || voiceStatus === 'thinking' || voiceStatus === 'speaking'}
                  style={{
                    width: '40px',
                    height: '40px',
                    minWidth: '40px',
                    background: isRecording ? '#dc2626' : voiceStatus !== 'idle' ? '#9ca3af' : '#6b7280',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '50%',
                    cursor: voiceStatus !== 'idle' && !isRecording ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    animation: isRecording ? 'pulse-red 1.5s infinite' : 'none',
                    transition: 'background 0.2s',
                    flexShrink: 0,
                    opacity: voiceStatus !== 'idle' && !isRecording ? 0.6 : 1,
                  }}
                >
                  {isRecording ? <MicOff size={18} /> : (voiceStatus !== 'idle' ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Mic size={18} />)}
                </button>
                <button type="submit" style={{ width: '40px', height: '40px', minWidth: '40px', background: 'var(--primary-color)', color: '#fff', border: 'none', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Send size={18} />
                </button>
              </form>
            </div>
          </section>
        </div>

        <div style={styles.sidebar}>
          <h3 style={{ margin: '0 0 1rem 0', color: 'var(--primary-color)' } as React.CSSProperties}>Your Trip</h3>
          <div style={{ marginBottom: '1rem' } as React.CSSProperties}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' } as React.CSSProperties}>
              <span style={{ color: '#555' } as React.CSSProperties}>Check-in</span>
              <span style={{ fontWeight: '600' } as React.CSSProperties}>{searchCriteria?.checkIn || 'Select date'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' } as React.CSSProperties}>
              <span style={{ color: '#555' } as React.CSSProperties}>Check-out</span>
              <span style={{ fontWeight: '600' } as React.CSSProperties}>{searchCriteria?.checkOut || 'Select date'}</span>
            </div>
          </div>
          <div style={styles.divider} />
          <div style={{ marginBottom: '1rem' } as React.CSSProperties}>
            <div style={styles.badgeGreen}><ShieldCheck size={14} /> Free Cancellation</div>
            <div style={styles.badgeGreen}><Utensils size={14} /> Breakfast Included</div>
          </div>
          <div style={styles.guarantee}>
            <ShieldCheck size={18} color="#0a192f" />
            <span>Best Price Guarantee</span>
          </div>
          <div style={styles.divider} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' } as React.CSSProperties}>
            <div>
              <div style={styles.totalLabel}>Total Price</div>
              <div style={{ fontSize: '0.75rem', color: '#555' } as React.CSSProperties}>Includes taxes & fees</div>
            </div>
            <div style={styles.price}>${property.pricePerNight}</div>
          </div>
          <button style={{ ...styles.reserveBtn, width: '100%', marginTop: '1rem' } as React.CSSProperties}>Continue to Booking</button>
        </div>
      </div>
    </div>
  );
};

export default PropertyDetails;
