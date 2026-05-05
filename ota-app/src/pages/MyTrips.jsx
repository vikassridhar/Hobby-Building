import { Link } from 'react-router-dom';
import { useBookings } from '../context/BookingContext';

const statusColors = {
  confirmed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  completed: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  cancelled: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
};

export default function MyTrips() {
  const { bookings, cancelBooking } = useBookings();

  const upcoming = bookings.filter(b => b.status === 'confirmed' || b.status === 'pending');
  const past = bookings.filter(b => b.status === 'completed' || b.status === 'cancelled');

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 animate-fade-in">
      <h1 className="text-2xl md:text-3xl font-bold mb-6">My Trips</h1>

      {upcoming.length === 0 && past.length === 0 ? (
        <div className="text-center py-20">
          <span className="text-6xl block mb-4">🧳</span>
          <h3 className="text-xl font-semibold mb-2">No trips yet</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">Start planning your next adventure!</p>
          <Link to="/search" className="bg-ocean-500 hover:bg-ocean-600 text-white font-bold px-6 py-3 rounded-xl transition-colors inline-block">
            Search Hotels
          </Link>
        </div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <div className="mb-10">
              <h2 className="text-lg font-semibold mb-4">Upcoming ({upcoming.length})</h2>
              <div className="space-y-4">
                {upcoming.map(booking => (
                  <div key={booking.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-slide-up">
                    <div className="flex gap-4 p-4">
                      <Link to={`/hotel/${booking.hotelId}`}>
                        <img src={booking.image} alt="" className="w-24 h-20 md:w-32 md:h-24 rounded-xl object-cover" />
                      </Link>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <Link to={`/hotel/${booking.hotelId}`} className="font-semibold hover:text-ocean-500 transition-colors line-clamp-1">{booking.hotelName}</Link>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{booking.roomType}</p>
                          </div>
                          <span className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full ${statusColors[booking.status]}`}>
                            {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
                          <span>📅 {booking.checkIn} → {booking.checkOut}</span>
                          <span>👥 {booking.guests} guests</span>
                        </div>
                        <div className="flex items-center justify-between mt-3">
                          <span className="font-bold text-ocean-600 dark:text-ocean-400">${booking.totalPriceUSD} <span className="text-xs font-normal text-gray-400">≈ ฿{booking.totalPriceTHB.toLocaleString()}</span></span>
                          {booking.status === 'confirmed' && (
                            <button
                              onClick={() => cancelBooking(booking.id)}
                              className="text-sm text-red-500 hover:text-red-600 font-medium"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {past.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-4">Past Trips ({past.length})</h2>
              <div className="space-y-4">
                {past.map(booking => (
                  <div key={booking.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden opacity-80">
                    <div className="flex gap-4 p-4">
                      <img src={booking.image} alt="" className="w-24 h-20 md:w-32 md:h-24 rounded-xl object-cover" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold line-clamp-1">{booking.hotelName}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{booking.roomType}</p>
                          </div>
                          <span className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full ${statusColors[booking.status]}`}>
                            {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
                          <span>📅 {booking.checkIn} → {booking.checkOut}</span>
                        </div>
                        <div className="mt-2">
                          <span className="font-medium">${booking.totalPriceUSD}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
