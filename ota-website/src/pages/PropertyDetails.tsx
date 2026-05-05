import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useBooking } from '../context/BookingContext';
import mockData from '../data/mockData.json';
import type { Property, Room } from '../types';
import { Star, MapPin, Check, Users, Bed, CreditCard, Send } from 'lucide-react';

export const PropertyDetails: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { setSelectedProperty, setSelectedRoom, searchCriteria } = useBooking();
  
  const [property, setProperty] = useState<Property | null>(null);
  const [askInput, setAskInput] = useState('');
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'assistant', text: string }[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (chatHistory.length > 0 || isTyping) {
      scrollToBottom();
    }
  }, [chatHistory, isTyping]);

  useEffect(() => {
    const prop = mockData.properties.find(p => p.id === id) as Property | undefined;
    if (prop) {
      setProperty(prop);
      setSelectedProperty(prop);
    }
  }, [id, setSelectedProperty]);

  if (!property) return <div className="page-wrapper container section-md text-center">Loading property...</div>;

  const handleBookRoom = (room: Room) => {
    if (!searchCriteria) {
      alert("Please select check-in and check-out dates on the home page first.");
      navigate('/');
      return;
    }
    setSelectedRoom(room);
    navigate('/book');
  };

  const handleAskQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!askInput.trim() || !property) return;
    
    const userMessage = askInput.trim();
    setAskInput('');
    setChatHistory(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsTyping(true);
    
    const systemPrompt = `You are the virtual concierge for "${property.name}" in ${property.location}.
Property Details: ${property.description}
Amenities: ${property.amenities.join(', ')}

You have access to web_search tool for finding current information about:
- Nearby airports and transport options
- Local attractions and sights
- Distance and travel times
- Current events or conditions

Strict Rules:
1. Provide a direct, final answer to the user's question.
2. If the user asks about the property, its amenities, nearby transport, airports, sights, or location, provide a helpful answer.
3. Use web_search tool when you need current or location-specific information not in the property details.
4. If the question is completely unrelated (e.g. math, coding, politics), politely decline by saying: "I can only assist with property-related questions."

Always respond in this exact JSON format only:
{"reasoning": "your internal thoughts", "tool_call": {"name": "web_search", "query": "search query here"} or null, "reply": "your response to the guest"}

If you need to use the web_search tool, set "tool_call" with the query and leave "reply" empty or with a placeholder. The system will provide the search results in the next turn.`;

    const messages = [];
    messages.push({ role: 'system', content: systemPrompt });
    chatHistory.forEach(msg => {
      messages.push({ role: msg.role, content: msg.text });
    });
    messages.push({ role: 'user', content: userMessage });

    try {
      const resp = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: "gemma-4",
          messages: messages
        })
      });
      
      const responseData = await resp.json();
      console.log('[Chat] Response received:', responseData);
      
      let answerText = "";
      try {
        const content = responseData.choices?.[0]?.message?.content;
        console.log('[Chat] Content:', content);
        
        if (typeof content !== 'string') {
          throw new Error("Content is not a string");
        }

        // First try to find a JSON block in the text
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        const jsonToParse = jsonMatch ? jsonMatch[0] : content;
        
        const clean = jsonToParse.replace(/```json|```/g, "").trim();
        console.log('[Chat] Cleaned JSON:', clean);
        
        const parsed = JSON.parse(clean);
        answerText = parsed.reply || "";
        console.log('[Chat] Parsed reply:', answerText);
      } catch (e) {
        console.error('[Chat] Parsing error:', e);
        // If JSON parsing fails, just use the raw content as the reply
        const content = responseData.choices?.[0]?.message?.content;
        if (typeof content === 'string' && content.trim()) {
          answerText = content.trim();
          console.log('[Chat] Using raw content:', answerText);
        } else {
          answerText = "Sorry, I was unable to process the response.";
        }
      }

      setChatHistory(prev => [...prev, { role: 'assistant', text: answerText }]);
    } catch (err) {
      console.error(err);
      setChatHistory(prev => [...prev, { role: 'assistant', text: "Sorry, I was unable to reach the local AI concierge backend." }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="page-wrapper container section-md">
      {/* Header */}
      <div className="flex-mobile-column justify-between items-start mb-6 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            {[...Array(5)].map((_, i) => (
              <Star 
                key={i} 
                size={16} 
                fill={i < property.stars ? "var(--accent-color)" : "transparent"} 
                color={i < property.stars ? "var(--accent-color)" : "var(--border-color)"} 
              />
            ))}
            <span className="badge" style={{ backgroundColor: 'var(--bg-card-hover)', color: 'var(--text-muted)', border: '1px solid var(--border-color)', fontSize: '0.75rem', marginLeft: '8px' }}>
              {property.propertyType}
            </span>
          </div>
          <h1 className="font-serif text-gradient" style={{ fontSize: '2.5rem', marginBottom: '8px', lineHeight: 1.2 }}>{property.name}</h1>
          <div className="flex items-center gap-4 wrap" style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            <span className="flex items-center gap-1"><MapPin size={18} /> {property.location}</span>
            <span>•</span>
            <span>{property.rating} Guest Rating</span>
            <span>•</span>
            <span>{property.distanceFromCenter}km from city center</span>
          </div>
        </div>
      </div>

      {/* Image Gallery */}
      <div className="grid grid-cols-4 gap-2 md:gap-4 mb-6 md:mb-10" style={{ height: 'min(400px, 60vh)', borderRadius: 'var(--border-radius-lg)', overflow: 'hidden' }}>
        <img src={property.images[0]} alt="" style={{ gridColumn: 'span 4', gridRow: 'span 1', width: '100%', height: '100%', objectFit: 'cover' }} className="md:grid-span-2 md:grid-row-2 md:col-span-2" />
        {property.images.slice(1, 5).map((img, i) => (
          <img key={i} src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} className="hide-on-mobile" />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-10">
        <div className="lg:col-span-2">
          {/* Description */}
          <section className="mb-10">
            <h2 className="font-serif mb-4" style={{ fontSize: '1.8rem' }}>About this Property</h2>
            <p style={{ fontSize: '1.05rem', lineHeight: 1.8, color: 'var(--text-main)' }}>{property.description}</p>
          </section>

          {/* Amenities */}
          <section className="mb-10">
            <h2 className="font-serif mb-4" style={{ fontSize: '1.8rem' }}>Premium Amenities</h2>
            <div className="grid grid-cols-2 gap-4">
              {property.amenities.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                  <Check size={18} color="var(--primary-color)" />
                  {item}
                </div>
              ))}
            </div>
          </section>

          {/* Room Selection */}
          <section className="mb-10">
            <h2 className="font-serif mb-4" style={{ fontSize: '1.8rem' }}>Available Rooms</h2>
            <div className="flex" style={{ flexDirection: 'column', gap: '16px' }}>
              {property.rooms.map(room => (
                <div key={room.id} className="card" style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 className="font-serif mb-2" style={{ fontSize: '1.2rem', color: 'var(--primary-color)' }}>{room.name}</h3>
                    <div className="flex gap-4" style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                      <span className="flex items-center gap-1"><Users size={16} /> Sleeps {room.capacity}</span>
                      <span className="flex items-center gap-1"><Bed size={16} /> {room.beds}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--primary-color)' }}>${room.price}</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>per night</div>
                    </div>
                    <button className="btn btn-primary" onClick={() => handleBookRoom(room)}>Reserve</button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Reviews */}
          <section className="mb-10">
            <h2 className="font-serif mb-4" style={{ fontSize: '1.8rem' }}>Recent Reviews</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {property.reviews.map(review => (
                <div key={review.id} className="card" style={{ padding: '20px' }}>
                  <div className="flex items-center justify-between mb-2">
                    <span style={{ fontWeight: 600 }}>{review.author}</span>
                    <span className="flex items-center gap-1" style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}><Star size={14} fill="var(--accent-color)" color="var(--accent-color)" /> {review.rating}</span>
                  </div>
                  <p style={{ fontSize: '0.95rem', color: 'var(--text-main)', fontStyle: 'italic' }}>"{review.comment}"</p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '8px' }}>{new Date(review.date).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Ask Q&A Section */}
          <section className="mb-10">
            <h2 className="font-serif mb-4" style={{ fontSize: '1.8rem' }}>Ask About This Property</h2>
            <div className="card" style={{ padding: '20px' }}>
              <div style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '12px', padding: '10px' }}>
                {chatHistory.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>Have a question? Ask it here and we'll give you specific answers based on {property.name}'s details.</p>
                ) : (
                  chatHistory.map((msg, i) => (
                    <div key={i} style={{ 
                      alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                      backgroundColor: msg.role === 'user' ? 'var(--primary-color)' : 'var(--bg-card-hover)',
                      color: msg.role === 'user' ? '#fff' : 'var(--text-main)',
                      padding: '10px 14px',
                      borderRadius: '12px',
                      maxWidth: '85%'
                    }}>
                      <span style={{ fontSize: '0.9rem' }}>{msg.text}</span>
                    </div>
                  ))
                )}
                {isTyping && (
                  <div style={{ 
                    alignSelf: 'flex-start',
                    backgroundColor: 'var(--bg-card-hover)',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    maxWidth: '85%',
                    display: 'flex',
                    alignItems: 'center'
                  }}>
                    <div className="typing-dots">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
              <form onSubmit={handleAskQuestion} className="flex gap-2 items-stretch">
                <input 
                  type="text" 
                  className="input-field" 
                  style={{ flex: 1 }} 
                  placeholder="Ask a question..." 
                  value={askInput}
                  onChange={e => setAskInput(e.target.value)}
                />
                <button type="submit" className="btn btn-primary btn-compact" style={{ padding: '0 18px', minWidth: '50px' }}>
                  <Send size={18} /> <span className="hide-on-mobile">Ask</span>
                </button>
              </form>
            </div>
          </section>
        </div>

        {/* Sidebar Summary */}
        <div className="lg:col-span-1">
          <div className="card" style={{ padding: '24px', position: 'sticky', top: '100px' }}>
            <h3 className="font-serif mb-4" style={{ fontSize: '1.4rem' }}>Your selection</h3>
            {searchCriteria ? (
              <div style={{ padding: '16px', backgroundColor: 'var(--bg-card-hover)', borderRadius: 'var(--border-radius)', marginBottom: '20px', fontSize: '0.95rem' }}>
                <p className="flex justify-between mb-2"><span>Check-in:</span> <strong>{searchCriteria.checkIn}</strong></p>
                <p className="flex justify-between mb-2"><span>Check-out:</span> <strong>{searchCriteria.checkOut}</strong></p>
                <p className="flex justify-between"><span>Guests:</span> <strong>{searchCriteria.guests} Guests</strong></p>
              </div>
            ) : (
              <div style={{ padding: '16px', backgroundColor: '#fff3cd', color: '#856404', borderRadius: 'var(--border-radius)', marginBottom: '20px', fontSize: '0.95rem' }}>
                Please set travel dates to see availability.
                <button className="btn btn-outline w-full mt-4" onClick={() => navigate('/')}>Set Dates</button>
              </div>
            )}

            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px 0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              {property.freeCancellation && (
                <li className="flex items-center gap-2 mb-2" style={{ color: '#2ecc71', fontWeight: 600 }}><Check size={16} /> Free cancellation included</li>
              )}
              {property.breakfastIncluded && (
                <li className="flex items-center gap-2 mb-2"><Check size={16} color="var(--accent-color)" /> Breakfast included</li>
              )}
              <li className="flex items-center gap-2 mb-2"><Check size={16} color="var(--accent-color)" /> Best price guarantee</li>
              <li className="flex items-center gap-2 mb-2"><CreditCard size={16} color="var(--accent-color)" /> Secure booking processing</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
