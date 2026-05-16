import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBooking } from '../context/BookingContext';
import { Search, MapPin, Calendar, Users } from 'lucide-react';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { setSearchCriteria } = useBooking();
  const [location, setLocation] = useState('Bangkok');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState(2);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchCriteria({ location, checkIn, checkOut, guests });
    navigate('/search');
  };

  const handleTrendingClick = (dest: string) => {
    setSearchCriteria({ location: dest, checkIn: '', checkOut: '', guests: 2 });
    navigate('/search');
  };

  return (
    <div style={{ fontFamily: "'Inter', 'Helvetica Neue', sans-serif", color: '#1a1a1a' } as React.CSSProperties}>
      {/* Hero Section */}
      <div style={{
        height: '100vh',
        background: 'linear-gradient(rgba(10, 25, 47, 0.75), rgba(10, 25, 47, 0.65)), url("https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1920&q=80") center/cover no-repeat',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
        color: 'var(--bg-card)',
        padding: '2rem'
      } as React.CSSProperties}>
        <h1 style={{ fontSize: '3.5rem', fontWeight: 300, letterSpacing: '3px', marginBottom: '1rem', textTransform: 'uppercase', textShadow: '0 2px 10px rgba(0,0,0,0.3)' } as React.CSSProperties}>
          Discover Luxury Stays
        </h1>
        <p style={{ fontSize: '1.2rem', marginBottom: '3rem', opacity: 0.95, maxWidth: '600px', lineHeight: 1.6 } as React.CSSProperties}>
          Experience the world's most exclusive hotels and resorts with unparalleled service.
        </p>
        
        <form onSubmit={handleSearch} style={{
          background: 'var(--bg-card)',
          padding: '1.5rem',
          borderRadius: '8px',
          display: 'flex',
          gap: '1rem',
          flexWrap: 'wrap',
          justifyContent: 'center',
          alignItems: 'flex-end',
          maxWidth: '1100px',
          width: '95%',
          boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
        } as React.CSSProperties}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', flex: 1, minWidth: '160px' } as React.CSSProperties}>
            <label style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.4rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' } as React.CSSProperties}>Destination</label>
            <div style={{ position: 'relative', width: '100%' } as React.CSSProperties}>
              <MapPin size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#999' } as React.CSSProperties} />
              <select value={location} onChange={(e) => setLocation(e.target.value)} style={{ padding: '0.8rem 0.8rem 0.8rem 2.5rem', border: '1px solid #e0e0e0', borderRadius: '4px', width: '100%', fontSize: '0.95rem', color: '#333', background: '#fafafa' } as React.CSSProperties}>
                <option>Bangkok</option>
                <option>Bali</option>
                <option>Tokyo</option>
                <option>Paris</option>
                <option>New York</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', flex: 1, minWidth: '160px' } as React.CSSProperties}>
            <label style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.4rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' } as React.CSSProperties}>Check-in</label>
            <div style={{ position: 'relative', width: '100%' } as React.CSSProperties}>
              <Calendar size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#999' } as React.CSSProperties} />
              <input type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} style={{ padding: '0.8rem 0.8rem 0.8rem 2.5rem', border: '1px solid #e0e0e0', borderRadius: '4px', width: '100%', fontSize: '0.95rem', color: '#333', background: '#fafafa' } as React.CSSProperties} />
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', flex: 1, minWidth: '160px' } as React.CSSProperties}>
            <label style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.4rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' } as React.CSSProperties}>Check-out</label>
            <div style={{ position: 'relative', width: '100%' } as React.CSSProperties}>
              <Calendar size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#999' } as React.CSSProperties} />
              <input type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} style={{ padding: '0.8rem 0.8rem 0.8rem 2.5rem', border: '1px solid #e0e0e0', borderRadius: '4px', width: '100%', fontSize: '0.95rem', color: '#333', background: '#fafafa' } as React.CSSProperties} />
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', flex: 1, minWidth: '120px' } as React.CSSProperties}>
            <label style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.4rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' } as React.CSSProperties}>Guests</label>
            <div style={{ position: 'relative', width: '100%' } as React.CSSProperties}>
              <Users size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#999' } as React.CSSProperties} />
              <input type="number" min={1} max={10} value={guests} onChange={(e) => setGuests(Number(e.target.value))} style={{ padding: '0.8rem 0.8rem 0.8rem 2.5rem', border: '1px solid #e0e0e0', borderRadius: '4px', width: '100%', fontSize: '0.95rem', color: '#333', background: '#fafafa' } as React.CSSProperties} />
            </div>
          </div>
          <button type="submit" style={{
            padding: '0.9rem 2.5rem',
            background: 'var(--accent-color)',
            color: 'var(--bg-card)',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 600,
            letterSpacing: '1px',
            textTransform: 'uppercase',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'background 0.2s',
            height: '46px'
          } as React.CSSProperties}>
            <Search size={18} /> Search
          </button>
        </form>
      </div>

      {/* Trending Destinations */}
      <div style={{ padding: '5rem 2rem', maxWidth: '1200px', margin: '0 auto' } as React.CSSProperties}>
        <h2 style={{ textAlign: 'center', fontSize: '2.2rem', fontWeight: 300, marginBottom: '3.5rem', color: 'var(--primary-color)', letterSpacing: '1px' } as React.CSSProperties}>Trending Destinations</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' } as React.CSSProperties}>
          {[
            { name: 'Bangkok', img: 'https://images.unsplash.com/photo-1508009603885-50cf7c579365?auto=format&fit=crop&w=800&q=80' },
            { name: 'Bali', img: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=800&q=80' }
          ].map((dest) => (
            <div key={dest.name} onClick={() => handleTrendingClick(dest.name)} style={{
              position: 'relative',
              height: '320px',
              borderRadius: '8px',
              overflow: 'hidden',
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
              transition: 'transform 0.3s ease, box-shadow 0.3s ease'
            } as React.CSSProperties}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <img src={dest.img} alt={dest.name} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s ease' } as React.CSSProperties} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(10, 25, 47, 0.85), transparent)', display: 'flex', alignItems: 'flex-end', padding: '2rem' } as React.CSSProperties}>
                <h3 style={{ color: 'var(--bg-card)', fontSize: '1.8rem', fontWeight: 400, margin: 0, letterSpacing: '1px' } as React.CSSProperties}>{dest.name}</h3>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Home;
