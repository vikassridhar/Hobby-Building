import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBooking } from '../context/BookingContext';
import { MapPin, Calendar, Users, Search } from 'lucide-react';

export const Home: React.FC = () => {
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

  return (
    <div className="page-wrapper pb-0">
      {/* Hero Section */}
      <section style={{ 
        position: 'relative', 
        height: '80vh', 
        minHeight: '600px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: `linear-gradient(rgba(13, 27, 42, 0.4), rgba(13, 27, 42, 0.6)), url('https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}>
        <div className="container" style={{ textAlign: 'center', color: '#fff', zIndex: 2 }}>
          <h1 className="font-serif animate-fade-in hero-title" style={{ fontWeight: 700, marginBottom: '20px', textShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
            Find Your Next Great Aura
          </h1>
          <p className="animate-fade-in" style={{ fontSize: '1.1rem', marginBottom: '40px', opacity: 0.9, animationDelay: '0.2s', padding: '0 20px' }}>
            Discover and book premium stays across the world.
          </p>

          {/* Search Box */}
          <form 
            className="card animate-fade-in" 
            style={{ 
              padding: '24px', 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
              gap: '20px',
              animationDelay: '0.4s',
              marginTop: '40px',
              width: '100%',
              maxWidth: '900px',
              margin: '0 auto'
            }}
            onSubmit={handleSearch}
          >
            <div style={{ textAlign: 'left' }}>
              <label className="flex items-center gap-2 mb-2" style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 500 }}>
                <MapPin size={16} /> Destination
              </label>
              <select 
                className="input-field" 
                value={location} 
                onChange={(e) => setLocation(e.target.value)}
                style={{ appearance: 'none' }}
              >
                <option value="Bangkok">Bangkok, Thailand</option>
                <option value="Bali">Bali, Indonesia</option>
                <option value="Tokyo">Tokyo, Japan</option>
                <option value="Paris">Paris, France</option>
                <option value="New York">New York, USA</option>
              </select>
            </div>
            
            <div style={{ textAlign: 'left' }}>
              <label className="flex items-center gap-2 mb-2" style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 500 }}>
                <Calendar size={16} /> Check-in
              </label>
              <input type="date" className="input-field" required value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
            </div>
            
            <div style={{ textAlign: 'left' }}>
              <label className="flex items-center gap-2 mb-2" style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 500 }}>
                <Calendar size={16} /> Check-out
              </label>
              <input type="date" className="input-field" required value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
            </div>

            <div style={{ textAlign: 'left' }}>
              <label className="flex items-center gap-2 mb-2" style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 500 }}>
                <Users size={16} /> Guests
              </label>
              <input type="number" min="1" className="input-field" value={guests} onChange={(e) => setGuests(parseInt(e.target.value))} />
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button type="submit" className="btn btn-primary w-full" style={{ padding: '14px 20px' }}>
                <Search size={20} /> Search
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* Featured Destinations */}
      <section className="section-lg container">
        <h2 className="font-serif text-gradient" style={{ fontSize: '2.5rem', textAlign: 'center', marginBottom: '60px' }}>Trending Destinations</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2" style={{ gap: '30px' }}>
          <div className="card" style={{ position: 'relative', height: '400px', cursor: 'pointer' }} onClick={() => { setLocation('Bangkok'); handleSearch({preventDefault:()=>{}} as any); }}>
            <img src="https://images.unsplash.com/photo-1508009603885-50cf7cbf0eb5?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" alt="Bangkok" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '30px', background: 'linear-gradient(transparent, rgba(0,0,0,0.8))', color: '#fff' }}>
              <h3 className="font-serif" style={{ fontSize: '2rem' }}>Bangkok</h3>
              <p>Explore 100+ premium properties</p>
            </div>
          </div>
          <div className="card" style={{ position: 'relative', height: '400px', cursor: 'pointer' }} onClick={() => { setLocation('Bali'); handleSearch({preventDefault:()=>{}} as any); }}>
            <img src="https://images.unsplash.com/photo-1537996194471-e657df975ab4?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" alt="Bali" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '30px', background: 'linear-gradient(transparent, rgba(0,0,0,0.8))', color: '#fff' }}>
              <h3 className="font-serif" style={{ fontSize: '2rem' }}>Bali</h3>
              <p>Explore 100+ luxury resorts</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
