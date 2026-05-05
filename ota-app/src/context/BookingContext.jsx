import { createContext, useContext, useState } from 'react';

const BookingContext = createContext();

export function BookingProvider({ children }) {
  const [bookings, setBookings] = useState([
    {
      id: 'BK-2026-001',
      hotelId: 1,
      hotelName: 'The Grand Hyatt Bangkok',
      roomType: 'Deluxe Room',
      checkIn: '2026-05-15',
      checkOut: '2026-05-18',
      guests: 2,
      totalPriceUSD: 735,
      totalPriceTHB: 25725,
      status: 'confirmed',
      image: 'https://picsum.photos/seed/hyatt-bkk/400/250',
      bookedAt: '2026-04-20',
    },
    {
      id: 'BK-2026-002',
      hotelId: 7,
      hotelName: 'Anantara Layan Phuket Resort',
      roomType: 'Pool Villa',
      checkIn: '2026-06-10',
      checkOut: '2026-06-14',
      guests: 2,
      totalPriceUSD: 2000,
      totalPriceTHB: 70000,
      status: 'confirmed',
      image: 'https://picsum.photos/seed/anantara-phuket/400/250',
      bookedAt: '2026-04-25',
    },
    {
      id: 'BK-2026-003',
      hotelId: 18,
      hotelName: 'Park Hyatt Tokyo',
      roomType: 'Executive Suite',
      checkIn: '2026-03-01',
      checkOut: '2026-03-03',
      guests: 1,
      totalPriceUSD: 1000,
      totalPriceTHB: 35000,
      status: 'completed',
      image: 'https://picsum.photos/seed/parkhyatt-tokyo/400/250',
      bookedAt: '2026-02-15',
    },
  ]);

  const addBooking = (booking) => {
    setBookings(prev => [booking, ...prev]);
  };

  const cancelBooking = (id) => {
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'cancelled' } : b));
  };

  return (
    <BookingContext.Provider value={{ bookings, addBooking, cancelBooking }}>
      {children}
    </BookingContext.Provider>
  );
}

export const useBookings = () => useContext(BookingContext);
