import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { hotels, reviews } from '../data/mockData';

export default function HotelDetail() {
  const { id } = useParams();
  const hotel = hotels.find(h => h.id === parseInt(id));
  const hotelReviews = reviews.filter(r => r.hotelId === parseInt(id));
  const [activeImg, setActiveImg] = useState(0);
  const [selectedRoom, setSelectedRoom] = useState(0);

  if (!hotel) return (
    <div className="text-center py-20">
      <h2 className="text-2xl font-bold">Hotel not found</h2>
      <Link to="/search" className="text-ocean-500 mt-4 inline-block">← Back to search</Link>
    </div>
  );

  const allImages = [hotel.image, ...hotel.images];

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 animate-fade-in">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        <Link to="/" className="hover:text-ocean-500">Home</Link>
        <span className="mx-2">›</span>
        <Link to="/search" className="hover:text-ocean-500">Search</Link>
        <span className="mx-2">›</span>
        <span className="text-gray-800 dark:text-gray-200">{hotel.name}</span>
      </nav>

      {/* Gallery */}
      <div className="rounded-2xl overflow-hidden mb-6">
        <div className="aspect-[16/9] md:aspect-[21/9] relative">
          <img
            src={allImages[activeImg]}
            alt={hotel.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute top-4 right-4 bg-black/50 text-white text-sm px-3 py-1 rounded-full">
            {activeImg + 1} / {allImages.length}
          </div>
        </div>
        <div className="flex gap-2 mt-2 overflow-x-auto pb-2">
          {allImages.map((img, i) => (
            <button
              key={i}
              onClick={() => setActiveImg(i)}
              className={`shrink-0 w-20 h-14 md:w-28 md:h-20 rounded-lg overflow-hidden border-2 transition-all ${
                i === activeImg ? 'border-ocean-500 opacity-100' : 'border-transparent opacity-60 hover:opacity-80'
              }`}
            >
              <img src={img} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Header */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-amber-400">{'★'.repeat(hotel.stars)}</span>
              <span className="text-sm text-gray-500 dark:text-gray-400">{hotel.stars}-star hotel</span>
            </div>
            <h1 className="text-2xl md:text-4xl font-bold mb-2">{hotel.name}</h1>
            <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                </svg>
                {hotel.address}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <span className="bg-ocean-500 text-white text-sm font-bold px-2.5 py-1 rounded-lg">{hotel.rating}</span>
              <span className="font-medium">{hotel.rating >= 4.8 ? 'Exceptional' : hotel.rating >= 4.5 ? 'Excellent' : hotel.rating >= 4.0 ? 'Very Good' : 'Good'}</span>
              <span className="text-gray-400 text-sm">· {hotel.reviewCount.toLocaleString()} reviews</span>
            </div>
          </div>

          {/* Description */}
          <div>
            <h2 className="text-lg font-semibold mb-2">About this hotel</h2>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{hotel.description}</p>
          </div>

          {/* Amenities */}
          <div>
            <h2 className="text-lg font-semibold mb-3">Amenities</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {hotel.amenities.map(a => {
                const icons = {
                  WiFi: '📶', Pool: '🏊', Spa: '💆', Gym: '🏋️', Restaurant: '🍽️',
                  'Airport Transfer': '🚗', Parking: '🅿️', 'Room Service': '🛎️',
                  Bar: '🍸', Concierge: '🎩', 'Business Center': '💼', Laundry: '👕',
                  'Kids Club': '🧸', 'Beach Access': '🏖️', 'Hot Tub': '♨️', Sauna: '🧖',
                  'EV Charging': '⚡', 'Pet Friendly': '🐾', 'Cultural Activities': '🎭',
                };
                return (
                  <div key={a} className="flex items-center gap-2 p-2.5 bg-gray-50 dark:bg-gray-800 rounded-xl">
                    <span className="text-lg">{icons[a] || '✨'}</span>
                    <span className="text-sm">{a}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Room Types */}
          <div>
            <h2 className="text-lg font-semibold mb-3">Available Rooms</h2>
            <div className="space-y-3">
              {hotel.rooms.map((room, i) => (
                <button
                  key={room.id}
                  onClick={() => setSelectedRoom(i)}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                    selectedRoom === i
                      ? 'border-ocean-500 bg-ocean-50 dark:bg-ocean-950/30'
                      : 'border-gray-200 dark:border-gray-700 hover:border-ocean-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">{room.name}</h3>
                      <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400 mt-1">
                        <span>{room.size}</span>
                        <span>{room.bed} bed</span>
                        <span>Up to {room.maxGuests} guests</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xl font-bold text-ocean-600 dark:text-ocean-400">${room.priceUSD}</span>
                      <span className="text-sm text-gray-400 block">/night</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Reviews */}
          <div>
            <h2 className="text-lg font-semibold mb-3">Guest Reviews</h2>
            <div className="space-y-4">
              {hotelReviews.map(review => (
                <div key={review.id} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-ocean-100 dark:bg-ocean-900 text-ocean-600 dark:text-ocean-300 rounded-full flex items-center justify-center font-semibold text-sm">
                        {review.author[0]}
                      </div>
                      <div>
                        <span className="font-medium text-sm">{review.author}</span>
                        <span className="text-xs text-gray-400 block">{review.date}</span>
                      </div>
                    </div>
                    <span className="bg-ocean-500 text-white text-xs font-bold px-2 py-0.5 rounded">{review.rating}</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{review.text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Map Placeholder */}
          <div>
            <h2 className="text-lg font-semibold mb-3">Location</h2>
            <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl aspect-[16/9] flex items-center justify-center">
              <div className="text-center">
                <span className="text-4xl block mb-2">📍</span>
                <p className="text-gray-500 dark:text-gray-400 text-sm">{hotel.address}</p>
                <p className="text-gray-400 text-xs mt-1">{hotel.lat.toFixed(4)}°N, {hotel.lng.toFixed(4)}°E</p>
              </div>
            </div>
          </div>
        </div>

        {/* Booking Sidebar */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-lg">
            <div className="text-center mb-4">
              <span className="text-3xl font-bold text-ocean-600 dark:text-ocean-400">${hotel.rooms[selectedRoom].priceUSD}</span>
              <span className="text-gray-400">/night</span>
              <p className="text-sm text-gray-400 mt-1">≈ ฿{hotel.rooms[selectedRoom].priceTHB.toLocaleString()}</p>
            </div>
            <div className="space-y-3 mb-4">
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 border border-gray-200 dark:border-gray-700 rounded-xl">
                  <p className="text-xs text-gray-400">Check-in</p>
                  <p className="font-medium text-sm">May 15, 2026</p>
                </div>
                <div className="p-3 border border-gray-200 dark:border-gray-700 rounded-xl">
                  <p className="text-xs text-gray-400">Check-out</p>
                  <p className="font-medium text-sm">May 18, 2026</p>
                </div>
              </div>
              <div className="p-3 border border-gray-200 dark:border-gray-700 rounded-xl">
                <p className="text-xs text-gray-400">Room</p>
                <p className="font-medium text-sm">{hotel.rooms[selectedRoom].name}</p>
              </div>
              <div className="p-3 border border-gray-200 dark:border-gray-700 rounded-xl">
                <p className="text-xs text-gray-400">Guests</p>
                <p className="font-medium text-sm">2 adults</p>
              </div>
            </div>
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mb-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-500">${hotel.rooms[selectedRoom].priceUSD} × 3 nights</span>
                <span>${hotel.rooms[selectedRoom].priceUSD * 3}</span>
              </div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-500">Service fee</span>
                <span>${Math.round(hotel.rooms[selectedRoom].priceUSD * 3 * 0.12)}</span>
              </div>
              <div className="flex justify-between font-bold mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                <span>Total</span>
                <span className="text-ocean-600 dark:text-ocean-400">${hotel.rooms[selectedRoom].priceUSD * 3 + Math.round(hotel.rooms[selectedRoom].priceUSD * 3 * 0.12)}</span>
              </div>
            </div>
            <Link
              to={`/book/${hotel.id}?room=${selectedRoom}`}
              className="block w-full text-center bg-ocean-500 hover:bg-ocean-600 text-white font-bold py-3.5 rounded-xl transition-colors"
            >
              Book Now
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
