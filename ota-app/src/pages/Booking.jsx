import { useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { hotels } from '../data/mockData';
import { useBookings } from '../context/BookingContext';

export default function Booking() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const roomIdx = parseInt(searchParams.get('room') || '0');
  const hotel = hotels.find(h => h.id === parseInt(id));
  const { addBooking } = useBookings();

  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    cardNumber: '', cardExpiry: '', cardCvc: '', cardName: '',
    specialRequests: '',
  });
  const [errors, setErrors] = useState({});
  const [step, setStep] = useState(1); // 1: guest info, 2: payment, 3: review

  if (!hotel) return (
    <div className="text-center py-20">
      <h2 className="text-2xl font-bold">Hotel not found</h2>
      <Link to="/search" className="text-ocean-500 mt-4 inline-block">← Back to search</Link>
    </div>
  );

  const room = hotel.rooms[roomIdx] || hotel.rooms[0];
  const nights = 3;
  const subtotal = room.priceUSD * nights;
  const serviceFee = Math.round(subtotal * 0.12);
  const total = subtotal + serviceFee;
  const totalTHB = total * 35;

  const update = (field, value) => {
    setForm(f => ({ ...f, [field]: value }));
    if (errors[field]) setErrors(e => ({ ...e, [field]: null }));
  };

  const validateStep = (s) => {
    const errs = {};
    if (s === 1) {
      if (!form.firstName.trim()) errs.firstName = 'Required';
      if (!form.lastName.trim()) errs.lastName = 'Required';
      if (!form.email.trim() || !form.email.includes('@')) errs.email = 'Valid email required';
      if (!form.phone.trim()) errs.phone = 'Required';
    }
    if (s === 2) {
      if (!form.cardNumber.trim() || form.cardNumber.replace(/\s/g, '').length < 16) errs.cardNumber = '16 digits required';
      if (!form.cardExpiry.trim()) errs.cardExpiry = 'Required';
      if (!form.cardCvc.trim() || form.cardCvc.length < 3) errs.cardCvc = '3 digits required';
      if (!form.cardName.trim()) errs.cardName = 'Required';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = () => {
    const bookingId = 'BK-' + Date.now().toString(36).toUpperCase();
    const booking = {
      id: bookingId,
      hotelId: hotel.id,
      hotelName: hotel.name,
      roomType: room.name,
      checkIn: '2026-05-15',
      checkOut: '2026-05-18',
      guests: 2,
      totalPriceUSD: total,
      totalPriceTHB: totalTHB,
      status: 'confirmed',
      image: hotel.image,
      bookedAt: new Date().toISOString().split('T')[0],
    };
    addBooking(booking);
    window.location.href = `/confirmation/${bookingId}`;
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 animate-fade-in">
      <nav className="text-sm text-gray-500 mb-6">
        <Link to={`/hotel/${hotel.id}`} className="hover:text-ocean-500">← {hotel.name}</Link>
      </nav>

      <h1 className="text-2xl md:text-3xl font-bold mb-6">Complete Your Booking</h1>

      {/* Progress */}
      <div className="flex items-center gap-2 mb-8">
        {[1, 2, 3].map(s => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
              step >= s ? 'bg-ocean-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
            }`}>
              {step > s ? '✓' : s}
            </div>
            <span className={`text-sm font-medium hidden md:inline ${step >= s ? 'text-ocean-500' : 'text-gray-400'}`}>
              {s === 1 ? 'Guest Info' : s === 2 ? 'Payment' : 'Review'}
            </span>
            {s < 3 && <div className={`flex-1 h-0.5 ${step > s ? 'bg-ocean-500' : 'bg-gray-200 dark:bg-gray-700'}`} />}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          {/* Step 1: Guest Info */}
          {step === 1 && (
            <div className="space-y-4 animate-slide-up">
              <h2 className="text-lg font-semibold">Guest Information</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">First Name</label>
                  <input value={form.firstName} onChange={e => update('firstName', e.target.value)}
                    className={`w-full px-4 py-2.5 rounded-xl border ${errors.firstName ? 'border-red-400' : 'border-gray-200 dark:border-gray-700'} bg-white dark:bg-gray-800`}
                    placeholder="John" />
                  {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>}
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Last Name</label>
                  <input value={form.lastName} onChange={e => update('lastName', e.target.value)}
                    className={`w-full px-4 py-2.5 rounded-xl border ${errors.lastName ? 'border-red-400' : 'border-gray-200 dark:border-gray-700'} bg-white dark:bg-gray-800`}
                    placeholder="Doe" />
                  {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName}</p>}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Email</label>
                <input type="email" value={form.email} onChange={e => update('email', e.target.value)}
                  className={`w-full px-4 py-2.5 rounded-xl border ${errors.email ? 'border-red-400' : 'border-gray-200 dark:border-gray-700'} bg-white dark:bg-gray-800`}
                  placeholder="john@example.com" />
                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Phone</label>
                <input value={form.phone} onChange={e => update('phone', e.target.value)}
                  className={`w-full px-4 py-2.5 rounded-xl border ${errors.phone ? 'border-red-400' : 'border-gray-200 dark:border-gray-700'} bg-white dark:bg-gray-800`}
                  placeholder="+66 92 123 4567" />
                {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Special Requests (optional)</label>
                <textarea value={form.specialRequests} onChange={e => update('specialRequests', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                  rows={3} placeholder="Late check-in, extra pillows, etc." />
              </div>
              <button onClick={() => validateStep(1) && setStep(2)}
                className="w-full bg-ocean-500 hover:bg-ocean-600 text-white font-bold py-3 rounded-xl transition-colors">
                Continue to Payment
              </button>
            </div>
          )}

          {/* Step 2: Payment */}
          {step === 2 && (
            <div className="space-y-4 animate-slide-up">
              <h2 className="text-lg font-semibold">Payment Details</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 p-3 rounded-xl">
                🔒 This is a demo — no real payment will be processed
              </p>
              <div>
                <label className="text-sm font-medium mb-1 block">Card Number</label>
                <input value={form.cardNumber} onChange={e => update('cardNumber', e.target.value)}
                  className={`w-full px-4 py-2.5 rounded-xl border ${errors.cardNumber ? 'border-red-400' : 'border-gray-200 dark:border-gray-700'} bg-white dark:bg-gray-800`}
                  placeholder="4242 4242 4242 4242" maxLength={19} />
                {errors.cardNumber && <p className="text-red-500 text-xs mt-1">{errors.cardNumber}</p>}
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Cardholder Name</label>
                <input value={form.cardName} onChange={e => update('cardName', e.target.value)}
                  className={`w-full px-4 py-2.5 rounded-xl border ${errors.cardName ? 'border-red-400' : 'border-gray-200 dark:border-gray-700'} bg-white dark:bg-gray-800`}
                  placeholder="JOHN DOE" />
                {errors.cardName && <p className="text-red-500 text-xs mt-1">{errors.cardName}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Expiry</label>
                  <input value={form.cardExpiry} onChange={e => update('cardExpiry', e.target.value)}
                    className={`w-full px-4 py-2.5 rounded-xl border ${errors.cardExpiry ? 'border-red-400' : 'border-gray-200 dark:border-gray-700'} bg-white dark:bg-gray-800`}
                    placeholder="MM/YY" />
                  {errors.cardExpiry && <p className="text-red-500 text-xs mt-1">{errors.cardExpiry}</p>}
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">CVC</label>
                  <input value={form.cardCvc} onChange={e => update('cardCvc', e.target.value)}
                    className={`w-full px-4 py-2.5 rounded-xl border ${errors.cardCvc ? 'border-red-400' : 'border-gray-200 dark:border-gray-700'} bg-white dark:bg-gray-800`}
                    placeholder="123" maxLength={4} />
                  {errors.cardCvc && <p className="text-red-500 text-xs mt-1">{errors.cardCvc}</p>}
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep(1)}
                  className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-700 font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  Back
                </button>
                <button onClick={() => validateStep(2) && setStep(3)}
                  className="flex-1 bg-ocean-500 hover:bg-ocean-600 text-white font-bold py-3 rounded-xl transition-colors">
                  Review Booking
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Review */}
          {step === 3 && (
            <div className="space-y-4 animate-slide-up">
              <h2 className="text-lg font-semibold">Review Your Booking</h2>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-4 space-y-3">
                <div className="flex gap-3">
                  <img src={hotel.image} alt="" className="w-20 h-16 rounded-xl object-cover" />
                  <div>
                    <h3 className="font-semibold text-sm">{hotel.name}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{hotel.city}, {hotel.country}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{room.name}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div className="bg-white dark:bg-gray-900 p-2 rounded-lg">
                    <p className="text-xs text-gray-400">Check-in</p>
                    <p className="font-medium">May 15</p>
                  </div>
                  <div className="bg-white dark:bg-gray-900 p-2 rounded-lg">
                    <p className="text-xs text-gray-400">Check-out</p>
                    <p className="font-medium">May 18</p>
                  </div>
                  <div className="bg-white dark:bg-gray-900 p-2 rounded-lg">
                    <p className="text-xs text-gray-400">Guests</p>
                    <p className="font-medium">2 adults</p>
                  </div>
                </div>
                <div className="border-t border-gray-200 dark:border-gray-700 pt-3 text-sm">
                  <p className="text-gray-500 dark:text-gray-400">Guest: {form.firstName} {form.lastName}</p>
                  <p className="text-gray-500 dark:text-gray-400">Email: {form.email}</p>
                  <p className="text-gray-500 dark:text-gray-400">Card: •••• {form.cardNumber.slice(-4)}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep(2)}
                  className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-700 font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  Back
                </button>
                <button onClick={handleSubmit}
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-xl transition-colors">
                  Confirm & Pay ${total}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Summary */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 h-fit sticky top-24">
          <div className="flex gap-3 mb-4">
            <img src={hotel.image} alt="" className="w-16 h-12 rounded-lg object-cover" />
            <div>
              <h3 className="font-semibold text-sm line-clamp-1">{hotel.name}</h3>
              <p className="text-xs text-gray-500">{room.name} · {nights} nights</p>
            </div>
          </div>
          <div className="space-y-2 text-sm border-t border-gray-200 dark:border-gray-700 pt-3">
            <div className="flex justify-between"><span className="text-gray-500">${room.priceUSD} × {nights}</span><span>${subtotal}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Service fee</span><span>${serviceFee}</span></div>
            <div className="flex justify-between font-bold border-t border-gray-200 dark:border-gray-700 pt-2">
              <span>Total</span><span className="text-ocean-600">${total}</span>
            </div>
            <p className="text-xs text-gray-400">≈ ฿{totalTHB.toLocaleString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
