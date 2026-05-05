import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBooking } from '../context/BookingContext';
import { CreditCard, QrCode, Lock } from 'lucide-react';

export const Payment: React.FC = () => {
  const navigate = useNavigate();
  const { selectedProperty, selectedRoom, searchCriteria, bookingDetails } = useBooking();
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'qr'>('card');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!selectedProperty || !selectedRoom || !searchCriteria || !bookingDetails) {
    return <div className="container section-md">Missing booking details. Please start over.</div>;
  }

  // Same calculation for consistency
  const checkInDate = new Date(searchCriteria.checkIn);
  const checkOutDate = new Date(searchCriteria.checkOut);
  const diffTime = Math.abs(checkOutDate.getTime() - checkInDate.getTime());
  const nights = Math.max(Math.ceil(diffTime / (1000 * 60 * 60 * 24)), 1);
  const subTotal = selectedRoom.price * nights + Math.round(selectedRoom.price * nights * 0.1);

  const handlePay = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    // Simulate API call
    setTimeout(() => {
      setIsProcessing(false);
      navigate('/confirmation');
    }, 2000);
  };

  return (
    <div className="page-wrapper container section-md">
      <div className="card" style={{ maxWidth: '800px', margin: '0 auto', padding: '40px' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1 className="font-serif text-gradient" style={{ fontSize: '2.2rem', marginBottom: '8px' }}>Complete Payment</h1>
          <p style={{ color: 'var(--text-muted)' }}>Amount Due: <strong style={{ color: 'var(--primary-color)', fontSize: '1.2rem' }}>${subTotal}</strong></p>
        </div>

        {/* Custom Tab component */}
        <div className="flex gap-4 mb-8 flex-mobile-column" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
          <button 
            className={`btn ${paymentMethod === 'card' ? 'btn-primary' : 'btn-outline'}`} 
            style={{ flex: 1, padding: '14px', borderRadius: '8px' }}
            onClick={() => setPaymentMethod('card')}
          >
            <CreditCard size={20} /> Credit / Debit Card
          </button>
          <button 
            className={`btn ${paymentMethod === 'qr' ? 'btn-primary' : 'btn-outline'}`} 
            style={{ flex: 1, padding: '14px', borderRadius: '8px' }}
            onClick={() => setPaymentMethod('qr')}
          >
            <QrCode size={20} /> Regional QR (PromptPay / QRIS)
          </button>
        </div>

        <form onSubmit={handlePay}>
          {paymentMethod === 'card' && (
            <div className="animate-fade-in" style={{ padding: '20px', backgroundColor: 'var(--bg-card-hover)', borderRadius: 'var(--border-radius)', marginBottom: '30px' }}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>Card Number</label>
                  <input type="text" className="input-field" placeholder="0000 0000 0000 0000" maxLength={19} required style={{ backgroundColor: '#fff' }} />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>Name on Card</label>
                  <input type="text" className="input-field" placeholder="JOHN DOE" required style={{ backgroundColor: '#fff' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>Expiry (MM/YY)</label>
                  <input type="text" className="input-field" placeholder="MM/YY" maxLength={5} required style={{ backgroundColor: '#fff' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>CVC</label>
                  <input type="text" className="input-field" placeholder="123" maxLength={4} required style={{ backgroundColor: '#fff' }} />
                </div>
              </div>
            </div>
          )}

          {paymentMethod === 'qr' && (
            <div className="animate-fade-in flex" style={{ flexDirection: 'column', alignItems: 'center', padding: '40px', backgroundColor: 'var(--bg-card-hover)', borderRadius: 'var(--border-radius)', marginBottom: '30px', textAlign: 'center' }}>
              <div style={{ width: '200px', height: '200px', backgroundColor: '#fff', padding: '10px', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '20px' }}>
                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=AuraPaymentSimulator_${subTotal}`} alt="Payment QR Code" style={{ width: '100%', height: '100%' }} />
              </div>
              <h3 className="font-serif mb-2" style={{ fontSize: '1.2rem' }}>Scan with your banking app</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '300px' }}>Supports PromptPay, QRIS, and compatible international QR schemes.</p>
              
              <div style={{ marginTop: '20px', padding: '12px', borderRadius: '8px', backgroundColor: 'rgba(56, 161, 105, 0.1)', color: '#276749', fontSize: '0.9rem' }}>
                Simulator: Click "Pay Now" below to simulate a successful scan.
              </div>
            </div>
          )}

          <div className="flex items-center justify-between mt-8 flex-mobile-column gap-6">
            <div className="flex items-center gap-2" style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              <Lock size={16} /> 256-bit encrypted secure transaction
            </div>
            <button type="submit" className="btn btn-accent" disabled={isProcessing} style={{ padding: '14px 40px', fontSize: '1.1rem' }}>
              {isProcessing ? 'Processing...' : `Pay $${subTotal}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
