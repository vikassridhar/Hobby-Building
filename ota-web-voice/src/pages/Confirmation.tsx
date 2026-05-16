import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useBookingContext } from '../context/BookingContext';
import { CheckCircle, Download, Home } from 'lucide-react';

const Confirmation: React.FC = () => {
  const { bookingDetails, searchCriteria, selectedProperty, selectedRoom, resetBooking } = useBookingContext();
  const navigate = useNavigate();

  const bookingRef = React.useMemo(() => Math.random().toString(36).substring(2, 10).toUpperCase(), []);

  if (!bookingDetails || !searchCriteria || !selectedProperty || !selectedRoom) {
    navigate('/');
    return null;
  }

  const checkIn = new Date(searchCriteria.checkIn);
  const checkOut = new Date(searchCriteria.checkOut);
  const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));

  const styles = {
    container: { display: 'flex', minHeight: '100vh', background: 'var(--bg-main)', fontFamily: 'system-ui, sans-serif', alignItems: 'center', justifyContent: 'center' },
    card: { background: 'var(--bg-card)', padding: '3rem', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', width: '100%', maxWidth: '600px', textAlign: 'center' },
    icon: { color: '#28a745', marginBottom: '1rem' },
    heading: { color: 'var(--primary-color)', marginBottom: '0.5rem' },
    refCode: { background: '#f0f0f0', padding: '0.8rem', borderRadius: '4px', fontFamily: 'monospace', fontSize: '1.2rem', letterSpacing: '2px', margin: '1.5rem 0', color: 'var(--primary-color)' },
    summary: { textAlign: 'left', background: '#fafafa', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem', border: '1px solid #eee' },
    summaryRow: { display: 'flex', justifyContent: 'space-between', marginBottom: '0.8rem', borderBottom: '1px solid #eee', paddingBottom: '0.8rem' },
    label: { color: '#666', fontWeight: 500 },
    value: { color: 'var(--primary-color)', fontWeight: 600 },
    button: (primary: boolean) => ({ padding: '1rem 2rem', borderRadius: '4px', border: primary ? 'none' : '1px solid #ccc', background: primary ? 'var(--accent-color)' : 'var(--bg-card)', color: primary ? 'var(--bg-card)' : '#333', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem', marginRight: '1rem' }),
    btnContainer: { display: 'flex', justifyContent: 'center', gap: '1rem' }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <CheckCircle size={64} style={styles.icon} />
        <h1 style={styles.heading}>Booking Confirmed!</h1>
        <p style={{ color: '#666', marginBottom: '1rem' } as React.CSSProperties}>Thank you for your reservation.</p>
        <div style={styles.refCode}>REF: {bookingRef}</div>
        
        <div style={styles.summary}>
          <div style={styles.summaryRow}><span style={styles.label}>Property</span><span style={styles.value}>{selectedProperty.name}</span></div>
          <div style={styles.summaryRow}><span style={styles.label}>Room</span><span style={styles.value}>{selectedRoom.name}</span></div>
          <div style={styles.summaryRow}><span style={styles.label}>Dates</span><span style={styles.value}>{searchCriteria.checkIn} - {searchCriteria.checkOut} ({nights} nights)</span></div>
          <div style={styles.summaryRow}><span style={styles.label}>Guests</span><span style={styles.value}>{searchCriteria.guests}</span></div>
          <div style={styles.summaryRow}><span style={styles.label}>Guest Name</span><span style={styles.value}>{bookingDetails.firstName} {bookingDetails.lastName}</span></div>
        </div>

        <div style={styles.btnContainer}>
          <button style={styles.button(false)}><Download size={18} style={{ marginRight: '8px', verticalAlign: 'middle' } as React.CSSProperties} />Download Itinerary</button>
          <button style={styles.button(true)} onClick={() => { resetBooking(); navigate('/'); }}><Home size={18} style={{ marginRight: '8px', verticalAlign: 'middle' } as React.CSSProperties} />Return to Home</button>
        </div>
      </div>
    </div>
  );
};

export default Confirmation;
