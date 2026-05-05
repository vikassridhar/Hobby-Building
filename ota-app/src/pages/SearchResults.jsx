import { useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { hotels, destinations } from '../data/mockData';

export default function SearchResults() {
  const [searchParams] = useSearchParams();
  const destFilter = searchParams.get('destination') || '';

  const [search, setSearch] = useState('');
  const [priceRange, setPriceRange] = useState([0, 500]);
  const [minStars, setMinStars] = useState(0);
  const [sortBy, setSortBy] = useState('rating');
  const [showFilters, setShowFilters] = useState(false);

  const filtered = useMemo(() => {
    let result = [...hotels];

    if (destFilter) {
      result = result.filter(h => h.destination === destFilter);
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(h =>
        h.name.toLowerCase().includes(q) ||
        h.city.toLowerCase().includes(q) ||
        h.country.toLowerCase().includes(q)
      );
    }
    result = result.filter(h => h.priceUSD >= priceRange[0] && h.priceUSD <= priceRange[1]);
    if (minStars > 0) result = result.filter(h => h.stars >= minStars);

    switch (sortBy) {
      case 'price_low': result.sort((a, b) => a.priceUSD - b.priceUSD); break;
      case 'price_high': result.sort((a, b) => b.priceUSD - a.priceUSD); break;
      case 'rating': result.sort((a, b) => b.rating - a.rating); break;
      case 'reviews': result.sort((a, b) => b.reviewCount - a.reviewCount); break;
    }
    return result;
  }, [search, priceRange, minStars, sortBy, destFilter]);

  const destName = destinations.find(d => d.id === destFilter)?.name;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 animate-fade-in">
      {/* Search Header */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold mb-4">
          {destName ? `Hotels in ${destName}` : 'Search Hotels'}
        </h1>
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="text"
              placeholder="Search hotels, cities, countries..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-ocean-500 text-base"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-3 rounded-xl border font-medium text-sm transition-colors ${
              showFilters
                ? 'bg-ocean-500 text-white border-ocean-500'
                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'
            }`}
          >
            <span className="hidden md:inline">Filters</span>
            <svg className="w-5 h-5 md:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
            </svg>
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="mb-6 p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 animate-slide-down">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Price Range: ${priceRange[0]} - ${priceRange[1]}</label>
              <input
                type="range"
                min="0"
                max="500"
                value={priceRange[1]}
                onChange={e => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                className="w-full accent-ocean-500"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Minimum Stars</label>
              <div className="flex gap-2">
                {[0, 1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    onClick={() => setMinStars(star)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      minStars === star
                        ? 'bg-ocean-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {star === 0 ? 'Any' : '★'.repeat(star)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Sort By</label>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
              >
                <option value="rating">Top Rated</option>
                <option value="price_low">Price: Low to High</option>
                <option value="price_high">Price: High to Low</option>
                <option value="reviews">Most Reviewed</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Results Count */}
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{filtered.length} hotels found</p>

      {/* Hotel Cards */}
      <div className="space-y-4">
        {filtered.map((hotel, i) => (
          <Link
            key={hotel.id}
            to={`/hotel/${hotel.id}`}
            className="group flex gap-4 bg-white dark:bg-gray-800 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-all duration-300 animate-slide-up"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <div className="w-32 md:w-56 shrink-0">
              <img
                src={hotel.image}
                alt={hotel.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                loading="lazy"
              />
            </div>
            <div className="flex-1 py-3 pr-4 flex flex-col justify-between min-w-0">
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <span className="text-amber-400 text-xs">{'★'.repeat(hotel.stars)}</span>
                  <span className="text-xs text-gray-400">({hotel.stars}-star)</span>
                </div>
                <h3 className="font-semibold text-sm md:text-lg line-clamp-1 group-hover:text-ocean-500 transition-colors">{hotel.name}</h3>
                <p className="text-gray-500 dark:text-gray-400 text-xs md:text-sm">{hotel.city}, {hotel.country}</p>
                <div className="hidden md:flex flex-wrap gap-1.5 mt-2">
                  {hotel.amenities.slice(0, 4).map(a => (
                    <span key={a} className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-md">{a}</span>
                  ))}
                  {hotel.amenities.length > 4 && <span className="text-xs text-gray-400">+{hotel.amenities.length - 4} more</span>}
                </div>
              </div>
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-1">
                  <span className="bg-ocean-500 text-white text-xs font-bold px-1.5 py-0.5 rounded">{hotel.rating}</span>
                  <span className="text-xs text-gray-400">({hotel.reviewCount.toLocaleString()})</span>
                </div>
                <div className="text-right">
                  <span className="text-lg md:text-xl font-bold text-ocean-600 dark:text-ocean-400">${hotel.priceUSD}</span>
                  <span className="text-xs text-gray-400">/night</span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-20">
          <span className="text-6xl mb-4 block">🏨</span>
          <h3 className="text-xl font-semibold mb-2">No hotels found</h3>
          <p className="text-gray-500 dark:text-gray-400">Try adjusting your search or filters</p>
        </div>
      )}
    </div>
  );
}
