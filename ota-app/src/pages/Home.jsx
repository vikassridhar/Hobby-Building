import { Link } from 'react-router-dom';
import { Browser } from '@capacitor/browser';
import { triggerBrowserTimer } from '../hooks/useBrowserTimer';
import { destinations, hotels } from '../data/mockData';

// Open in-app browser
const openInAppBrowser = async (url) => {
  try {
    await Browser.open({ url, windowName: '_self' });
    triggerBrowserTimer(url);
  } catch (e) {
    console.error('Browser error:', e);
  }
};

export default function Home() {
  const topRated = [...hotels].sort((a, b) => b.rating - a.rating).slice(0, 4);

  return (
    <div className="animate-fade-in">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-ocean-600 via-ocean-700 to-ocean-900 text-white">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-coral-400 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 py-16 md:py-24">
          <div className="max-w-2xl">
            <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-4">
              Discover your next <span className="text-coral-300">adventure</span>
            </h1>
            <p className="text-lg md:text-xl text-ocean-100 mb-8">
              Book hotels across Asia Pacific at the best prices. From budget hostels to luxury resorts.
            </p>
          </div>
          {/* Search Bar */}
          <Link
            to="/search"
            className="block max-w-2xl bg-white dark:bg-gray-800 rounded-2xl p-4 md:p-6 shadow-2xl hover:shadow-3xl transition-shadow"
          >
            <div className="flex items-center gap-3 text-gray-800 dark:text-gray-200">
              <svg className="w-6 h-6 text-ocean-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <div className="flex-1">
                <p className="text-sm text-gray-500 dark:text-gray-400">Where to?</p>
                <p className="text-lg font-medium">Search destinations, hotels...</p>
              </div>
              <div className="bg-ocean-500 text-white px-5 py-2.5 rounded-xl font-medium text-sm hover:bg-ocean-600 transition-colors">
                Search
              </div>
            </div>
          </Link>
        </div>
      </section>

      {/* Popular Destinations */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl md:text-3xl font-bold">Popular Destinations</h2>
          <Link to="/search" className="text-ocean-600 dark:text-ocean-400 font-medium text-sm hover:underline">
            View all →
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {destinations.map(dest => (
            <Link
              key={dest.id}
              to={`/search?destination=${dest.id}`}
              className="group relative rounded-2xl overflow-hidden aspect-[3/4] animate-scale-in"
            >
              <img
                src={dest.image}
                alt={dest.name}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <h3 className="text-white font-bold text-lg">{dest.name}</h3>
                <p className="text-white/80 text-sm">{dest.country} · {dest.hotelCount} hotels</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Top Rated */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl md:text-3xl font-bold">Top Rated</h2>
          <Link to="/search" className="text-ocean-600 dark:text-ocean-400 font-medium text-sm hover:underline">
            See more →
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {topRated.map((hotel, i) => (
            <Link
              key={hotel.id}
              to={`/hotel/${hotel.id}`}
              className="group bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-gray-700 animate-slide-up"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="aspect-[4/3] overflow-hidden">
                <img
                  src={hotel.image}
                  alt={hotel.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
              </div>
              <div className="p-4">
                <div className="flex items-center gap-1 mb-1">
                  <span className="text-amber-400 text-sm">{'★'.repeat(hotel.stars)}</span>
                </div>
                <h3 className="font-semibold text-sm md:text-base line-clamp-1">{hotel.name}</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm">{hotel.city}, {hotel.country}</p>
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-1">
                    <span className="bg-ocean-500 text-white text-xs font-bold px-2 py-0.5 rounded-lg">{hotel.rating}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">({hotel.reviewCount.toLocaleString()})</span>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-ocean-600 dark:text-ocean-400">${hotel.priceUSD}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">/night</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Deals Banner */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        <div className="bg-gradient-to-r from-coral-500 to-coral-600 rounded-3xl p-8 md:p-12 text-white relative overflow-hidden">
          <div className="absolute right-0 top-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/4" />
          <div className="relative max-w-lg">
            <span className="bg-white/20 text-sm font-medium px-3 py-1 rounded-full">Limited Time</span>
            <h2 className="text-3xl md:text-4xl font-bold mt-4 mb-2">Summer Sale 🔥</h2>
            <p className="text-coral-100 mb-6">Up to 40% off on selected hotels in Thailand and Bali. Book before May 31st!</p>
            <Link
              to="/search"
              className="inline-flex items-center gap-2 bg-white text-coral-600 font-bold px-6 py-3 rounded-xl hover:bg-coral-50 transition-colors"
            >
              Browse Deals
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 mt-8">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">✈️</span>
                <span className="text-lg font-bold bg-gradient-to-r from-ocean-600 to-coral-500 bg-clip-text text-transparent">TravelApp</span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Your gateway to amazing stays across Asia Pacific.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-sm">Company</h4>
              <ul className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
                <li><a href="#" className="hover:text-ocean-500">About Us</a></li>
                <li><a href="#" className="hover:text-ocean-500">Careers</a></li>
                <li><a href="#" className="hover:text-ocean-500">Press</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-sm">Support</h4>
              <ul className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
                <li><button onClick={() => openInAppBrowser('https://www.google.com/search?q=hotels+travel')} className="hover:text-ocean-500 text-left">Search on Google</button></li>
                <li><a href="#" className="hover:text-ocean-500">Help Center</a></li>
                <li><a href="#" className="hover:text-ocean-500">Safety</a></li>
                <li><a href="#" className="hover:text-ocean-500">Cancellation</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-sm">Legal</h4>
              <ul className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
                <li><a href="#" className="hover:text-ocean-500">Privacy</a></li>
                <li><a href="#" className="hover:text-ocean-500">Terms</a></li>
                <li><a href="#" className="hover:text-ocean-500">Cookie Policy</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-200 dark:border-gray-800 mt-8 pt-8 text-center text-sm text-gray-400">
            © 2026 TravelApp. All rights reserved. This is a demo application.
          </div>
        </div>
      </footer>
    </div>
  );
}
