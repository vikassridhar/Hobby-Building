import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBooking } from '../context/BookingContext';

export const BookingForm: React.FC = () => {
  const navigate = useNavigate();
  const { selectedProperty, selectedRoom, searchCriteria, setBookingDetails } = useBooking();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');

  if (!selectedProperty || !selectedRoom || !searchCriteria) {
    return <div className="container section-md">Please select a property and room first.</div>;
  }

  // Calculate nights
  const checkInDate = new Date(searchCriteria.checkIn);
  const checkOutDate = new Date(searchCriteria.checkOut);
  const diffTime = Math.abs(checkOutDate.getTime() - checkInDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const nights = diffDays > 0 ? diffDays : 1;

  const roomTotal = selectedRoom.price * nights;
  const taxes = Math.round(roomTotal * 0.1);
  const subTotal = roomTotal + taxes;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setBookingDetails({ firstName, lastName, email, phone, specialRequests });
    navigate('/payment');
  };

  return (
    <div className="page-wrapper container section-md">
      <div className="flex justify-between items-start mb-6">
        <h1 className="font-serif text-gradient" style={{ fontSize: '2.5rem' }}>Secure Your Stay</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2">
          <form className="card" style={{ padding: '30px' }} onSubmit={handleSubmit}>
            <h2 className="font-serif mb-6" style={{ fontSize: '1.5rem' }}>Guest Information</h2>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>First Name</label>
                <input type="text" className="input-field" required value={firstName} onChange={e => setFirstName(e.target.value)} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Last Name</label>
                <input type="text" className="input-field" required value={lastName} onChange={e => setLastName(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Email Address</label>
                <input type="email" className="input-field" required value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Phone Number</label>
                <input type="tel" className="input-field" required value={phone} onChange={e => setPhone(e.target.value)} />
              </div>
            </div>

            <div className="mb-6">
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Special Requests (Optional)</label>
              <textarea 
                className="input-field" 
                rows={4} 
                style={{ resize: 'none' }}
                value={specialRequests}
                onChange={e => setSpecialRequests(e.target.value)}
                placeholder="Early check-in, dietary requirements..."
              ></textarea>
            </div>

            <div className="flex justify-end mt-8">
              <button type="submit" className="btn btn-primary" style={{ padding: '12px 32px' }}>Proceed to Payment</button>
            </div>
          </form>
        </div>

        {/* Summary sidebar */}
        <div className="lg:col-span-1">
          <div className="card" style={{ padding: '24px', position: 'sticky', top: '100px' }}>
            <h3 className="font-serif mb-4" style={{ fontSize: '1.4rem' }}>Booking Summary</h3>
            
            <div className="flex gap-4 mb-6 pb-6" style={{ borderBottom: '1px solid var(--border-color)' }}>
              <img src={selectedProperty.images[0]} alt="" style={{ width: '80px', height: '80px', borderRadius: '8px', objectFit: 'cover' }} />
              <div>
                <div style={{ fontWeight: 600 }}>{selectedProperty.name}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{selectedProperty.location}</div>
              </div>
            </div>

            <div className="mb-6 pb-6" style={{ borderBottom: '1px solid var(--border-color)', fontSize: '0.95rem' }}>
              <div className="flex justify-between mb-2"><span style={{ color: 'var(--text-muted)' }}>Check-in</span> <strong>{searchCriteria.checkIn}</strong></div>
              <div className="flex justify-between mb-2"><span style={{ color: 'var(--text-muted)' }}>Check-out</span> <strong>{searchCriteria.checkOut}</strong></div>
              <div className="flex justify-between mb-2"><span style={{ color: 'var(--text-muted)' }}>Room</span> <strong>{selectedRoom.name}</strong></div>
              <div className="flex justify-between"><span style={{ color: 'var(--text-muted)' }}>Duration</span> <strong>{nights} Night(s)</strong></div>
            </div>

            <div>
              <h4 className="font-serif mb-4" style={{ fontSize: '1.2rem' }}>Price Details</h4>
              <div className="flex justify-between mb-2"><span style={{ color: 'var(--text-muted)' }}>${selectedRoom.price} x {nights} nights</span> <span>${roomTotal}</span></div>
              <div className="flex justify-between mb-4"><span style={{ color: 'var(--text-muted)' }}>Taxes & Fees</span> <span>${taxes}</span></div>
              
              <div className="flex justify-between items-center" style={{ marginTop: '16px', paddingTop: '16px', borderTop: '2px dashed var(--border-color)' }}>
                <span style={{ fontWeight: 600, fontSize: '1.1rem' }}>Total</span>
                <span style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--primary-color)' }}>${subTotal}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
