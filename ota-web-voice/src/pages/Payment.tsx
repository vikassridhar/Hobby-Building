import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBookingContext } from '../context/BookingContext';
import { Lock, CreditCard, QrCode } from 'lucide-react';

const Payment: React.FC = () => {
  const { bookingDetails, searchCriteria, selectedProperty, selectedRoom } = useBookingContext();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'card' | 'qr'>('card');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!bookingDetails || !searchCriteria || !selectedProperty || !selectedRoom) {
    navigate('/');
    return null;
  }

  const checkIn = new Date(searchCriteria.checkIn);
  const checkOut = new Date(searchCriteria.checkOut);
  const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
  const total = (selectedRoom.price * nights) * 1.10;

  const handlePay = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      navigate('/confirmation');
    }, 2000);
  };

  const styles = {
    container: { display: 'flex', minHeight: '100vh', background: 'var(--bg-main)', fontFamily: 'system-ui, sans-serif', alignItems: 'center', justifyContent: 'center' },
    card: { background: 'var(--bg-card)', padding: '2.5rem', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', width: '100%', maxWidth: '500px' },
    tabs: { display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '2px solid #eee' },
    tab: (active: boolean) => ({ padding: '0.8rem 1.5rem', cursor: 'pointer', borderBottom: active ? '3px solid #c5a059' : 'none', fontWeight: active ? 'bold' : 'normal', color: active ? 'var(--accent-color)' : '#666', background: 'none', border: 'none', borderBottomWidth: '3px', borderBottomStyle: 'solid', borderBottomColor: active ? 'var(--accent-color)' : 'transparent' }),
    input: { width: '100%', padding: '0.8rem', marginBottom: '1rem', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' },
    row: { display: 'flex', gap: '1rem' },
    button: { width: '100%', padding: '1rem', background: 'var(--accent-color)', color: 'var(--bg-card)', border: 'none', borderRadius: '4px', cursor: isProcessing ? 'not-allowed' : 'pointer', fontWeight: 'bold', fontSize: '1.1rem', marginTop: '1rem', opacity: isProcessing ? 0.7 : 1 },
    badge: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginTop: '1.5rem', color: '#666', fontSize: '0.9rem' },
    qrContainer: { textAlign: 'center', padding: '2rem 0' }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={{ textAlign: 'center', color: 'var(--primary-color)', marginBottom: '1.5rem' } as React.CSSProperties}>Payment Details</h2>
        <div style={styles.tabs}>
          <button style={styles.tab(activeTab === 'card')} onClick={() => setActiveTab('card')}><CreditCard size={18} style={{ marginRight: '8px', verticalAlign: 'middle' } as React.CSSProperties} />Credit/Debit Card</button>
          <button style={styles.tab(activeTab === 'qr')} onClick={() => setActiveTab('qr')}><QrCode size={18} style={{ marginRight: '8px', verticalAlign: 'middle' } as React.CSSProperties} />QR Payment</button>
        </div>

        {activeTab === 'card' ? (
          <>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: 'var(--primary-color)' } as React.CSSProperties}>Card Number</label>
            <input style={styles.input} placeholder="0000 0000 0000 0000" />
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: 'var(--primary-color)' } as React.CSSProperties}>Cardholder Name</label>
            <input style={styles.input} placeholder={bookingDetails.firstName + ' ' + bookingDetails.lastName} />
            <div style={styles.row}>
              <div style={{ flex: 1 } as React.CSSProperties}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: 'var(--primary-color)' } as React.CSSProperties}>Expiry</label>
                <input style={styles.input} placeholder="MM/YY" />
              </div>
              <div style={{ flex: 1 } as React.CSSProperties}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: 'var(--primary-color)' } as React.CSSProperties}>CVC</label>
                <input style={styles.input} placeholder="123" />
              </div>
            </div>
          </>
        ) : (
          <div style={styles.qrContainer}>
            <p style={{ marginBottom: '1rem', color: '#666' } as React.CSSProperties}>Scan with your banking app</p>
            <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=PromptPay:${total.toFixed(2)}`} alt="QR Code" style={{ borderRadius: '8px', border: '4px solid #eee' } as React.CSSProperties} />
          </div>
        )}

        <button style={styles.button} onClick={handlePay} disabled={isProcessing}>
          {isProcessing ? 'Processing...' : `Pay $${total.toFixed(2)}`}
        </button>

        <div style={styles.badge}><Lock size={14} /> 256-bit encryption</div>
      </div>
    </div>
  );
};

export default Payment;
