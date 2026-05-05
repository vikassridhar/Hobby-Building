import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBooking } from '../context/BookingContext';
import { CheckCircle, Download, Calendar as CalendarIcon, MapPin } from 'lucide-react';

export const Confirmation: React.FC = () => {
  const navigate = useNavigate();
  const { selectedProperty, selectedRoom, searchCriteria, bookingDetails, resetBooking } = useBooking();
  const [refCode, setRefCode] = useState('');

  useEffect(() => {
    // Generate random reference code on mount
    setRefCode(Math.random().toString(36).substring(2, 10).toUpperCase());
    
    // Check if we arrived here improperly
    if (!selectedProperty) {
      navigate('/');
    }

    // Cleanup on unmount (simulated here for real logic)
    return () => {
      // Intentionally not calling resetBooking here to allow user to view page,
      // but in real app we'd clear state when leaving this page.
    };
  }, [selectedProperty, navigate]);

  if (!selectedProperty || !bookingDetails || !searchCriteria || !selectedRoom) return null;

  return (
    <div className="page-wrapper container section-md">
      <div className="card animate-fade-in" style={{ maxWidth: '700px', margin: '0 auto', padding: '60px 40px', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
          <CheckCircle size={80} color="var(--accent-color)" />
        </div>
        
        <h1 className="font-serif text-gradient" style={{ fontSize: '2.5rem', marginBottom: '16px' }}>Booking Confirmed!</h1>
        <p style={{ color: 'var(--text-main)', fontSize: '1.1rem', marginBottom: '40px' }}>
          Thank you, {bookingDetails.firstName}. Your reservation at {selectedProperty.name} is complete.
          We've sent a confirmation email to {bookingDetails.email}.
        </p>

        <div style={{ backgroundColor: 'var(--bg-card-hover)', borderRadius: 'var(--border-radius)', padding: '24px', textAlign: 'left', marginBottom: '40px' }}>
          <div className="flex justify-between items-center mb-6 pb-6" style={{ borderBottom: '1px solid var(--border-color)' }}>
            <div>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Booking Reference</span>
              <span style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '2px', color: 'var(--primary-color)' }}>{refCode}</span>
            </div>
            <button className="btn btn-outline" style={{ padding: '8px 16px', fontSize: '0.9rem' }}><Download size={16} /> Download Itinerary</button>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <h4 className="font-serif mb-2" style={{ fontSize: '1.2rem', color: 'var(--primary-color)' }}>{selectedProperty.name}</h4>
              <p className="flex items-start gap-2 mb-4" style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}><MapPin size={16} style={{ flexShrink: 0, marginTop: '2px' }} /> {selectedProperty.location}</p>
              <p style={{ fontSize: '0.95rem' }}><strong style={{ color: 'var(--text-main)' }}>Room:</strong> {selectedRoom.name}</p>
            </div>
            <div>
              <p className="flex items-center gap-2 mb-2" style={{ fontSize: '0.95rem' }}><CalendarIcon size={16} color="var(--text-muted)" /> <strong>Check-in:</strong> {searchCriteria.checkIn}</p>
              <p className="flex items-center gap-2 mb-2" style={{ fontSize: '0.95rem' }}><CalendarIcon size={16} color="var(--text-muted)" /> <strong>Check-out:</strong> {searchCriteria.checkOut}</p>
              <p className="flex items-center gap-2" style={{ fontSize: '0.95rem' }}><strong>Guests:</strong> {searchCriteria.guests}</p>
            </div>
          </div>
        </div>

        <button 
          className="btn btn-primary" 
          style={{ padding: '14px 40px' }}
          onClick={() => {
            resetBooking();
            navigate('/');
          }}
        >
          Return to Home
        </button>
      </div>
    </div>
  );
};
