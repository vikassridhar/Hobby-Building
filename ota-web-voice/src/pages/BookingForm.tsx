import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBookingContext } from '../context/BookingContext';
import { MapPin, Calendar, Users, ArrowRight } from 'lucide-react';

const BookingForm: React.FC = () => {
  const { selectedProperty, selectedRoom, searchCriteria, bookingDetails, setBookingDetails } = useBookingContext();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    firstName: bookingDetails.firstName || '',
    lastName: bookingDetails.lastName || '',
    email: bookingDetails.email || '',
    phone: bookingDetails.phone || '',
    specialRequests: bookingDetails.specialRequests || ''
  });

  if (!selectedProperty || !selectedRoom) {
    navigate('/');
    return null;
  }

  const checkIn = new Date(searchCriteria.checkIn);
  const checkOut = new Date(searchCriteria.checkOut);
  const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
  const roomPrice = selectedRoom.price;
  const subtotal = roomPrice * nights;
  const tax = subtotal * 0.10;
  const total = subtotal + tax;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setBookingDetails({ ...bookingDetails, ...formData });
    navigate('/payment');
  };

  const styles = {
    container: { display: 'flex', minHeight: '100vh', background: 'var(--bg-main)', fontFamily: 'system-ui, sans-serif' },
    formSection: { flex: 2, padding: '3rem', background: 'var(--bg-card)', borderRight: '1px solid #e0e0e0' },
    sidebar: { flex: 1, padding: '2rem', background: 'var(--primary-color)', color: 'var(--bg-card)', display: 'flex', flexDirection: 'column' },
    input: { width: '100%', padding: '0.8rem', marginBottom: '1rem', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' },
    textarea: { width: '100%', padding: '0.8rem', marginBottom: '1rem', border: '1px solid #ccc', borderRadius: '4px', minHeight: '100px', boxSizing: 'border-box' },
    label: { display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: 'var(--primary-color)' },
    button: { width: '100%', padding: '1rem', background: 'var(--accent-color)', color: 'var(--bg-card)', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem', marginTop: '1rem' },
    summaryItem: { display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.8rem', color: '#e0e0e0' },
    priceRow: { display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: '#e0e0e0' },
    totalRow: { display: 'flex', justifyContent: 'space-between', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #c5a059', fontWeight: 'bold', fontSize: '1.2rem', color: 'var(--accent-color)' }
  };

  return (
    <div style={styles.container}>
      <div style={styles.formSection}>
        <h2 style={{ color: 'var(--primary-color)', marginBottom: '2rem' } as React.CSSProperties}>Guest Information</h2>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', gap: '1rem' } as React.CSSProperties}>
            <div style={{ flex: 1 } as React.CSSProperties}>
              <label style={styles.label}>First Name</label>
              <input style={styles.input} name="firstName" value={formData.firstName} onChange={handleChange} required />
            </div>
            <div style={{ flex: 1 } as React.CSSProperties}>
              <label style={styles.label}>Last Name</label>
              <input style={styles.input} name="lastName" value={formData.lastName} onChange={handleChange} required />
            </div>
          </div>
          <label style={styles.label}>Email Address</label>
          <input style={styles.input} type="email" name="email" value={formData.email} onChange={handleChange} required />
          <label style={styles.label}>Phone Number</label>
          <input style={styles.input} type="tel" name="phone" value={formData.phone} onChange={handleChange} required />
          <label style={styles.label}>Special Requests</label>
          <textarea style={styles.textarea} name="specialRequests" value={formData.specialRequests} onChange={handleChange} />
          <button type="submit" style={styles.button}>Continue to Payment <ArrowRight size={18} style={{ marginLeft: '8px', verticalAlign: 'middle' } as React.CSSProperties} /></button>
        </form>
      </div>
      <div style={styles.sidebar}>
        <img src={selectedProperty.images[0] || 'https://via.placeholder.com/400x300'} alt={selectedProperty.name} style={{ width: '100%', borderRadius: '8px', marginBottom: '1.5rem' } as React.CSSProperties} />
        <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--accent-color)' } as React.CSSProperties}>{selectedProperty.name}</h3>
        <div style={styles.summaryItem}><MapPin size={16} /> {selectedProperty.location}</div>
        <div style={styles.summaryItem}><Calendar size={16} /> {searchCriteria.checkIn} - {searchCriteria.checkOut}</div>
        <div style={styles.summaryItem}><Users size={16} /> {searchCriteria.guests} Guests</div>
        <hr style={{ border: '0', borderTop: '1px solid #334', margin: '1.5rem 0' } as React.CSSProperties} />
        <h4 style={{ margin: '0 0 1rem 0', color: 'var(--bg-card)' } as React.CSSProperties}>Price Breakdown</h4>
        <div style={styles.priceRow}><span>{selectedRoom.name} x {nights} nights</span><span>${subtotal.toFixed(2)}</span></div>
        <div style={styles.priceRow}><span>Tax (10%)</span><span>${tax.toFixed(2)}</span></div>
        <div style={styles.totalRow}><span>Total</span><span>${total.toFixed(2)}</span></div>
      </div>
    </div>
  );
};

export default BookingForm;
