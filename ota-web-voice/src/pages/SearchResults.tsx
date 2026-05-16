import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useBooking } from '../context/BookingContext';
import mockData from '../data/mockData.json';
import { Star, MapPin, Filter, ChevronDown } from 'lucide-react';
import PropertyCard from '../components/PropertyCard';

const SearchResults: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { searchCriteria, setSearchCriteria, setSelectedProperty } = useBooking();

  const [filters, setFilters] = useState({
    minPrice: 50,
    maxPrice: 1000,
    stars: [] as number[],
    propertyType: [] as string[],
    guestRating: 0
  });
  const [sortBy, setSortBy] = useState('recommended');
  const [showFilters, setShowFilters] = useState(false);

  // Sync URL params to context on mount only
  useEffect(() => {
    const urlLoc = searchParams.get('location');
    if (urlLoc) {
      setSearchCriteria({ location: urlLoc });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const currentLocation = searchParams.get('location') || searchCriteria.location || 'Bangkok';

  const filteredProperties = useMemo(() => {
    let results = (mockData as any[]).filter(p => p.location.toLowerCase().includes(currentLocation.toLowerCase()));

    // Price filter
    results = results.filter(p => p.pricePerNight >= filters.minPrice && p.pricePerNight <= filters.maxPrice);
    // Star filter
    if (filters.stars.length > 0) {
      results = results.filter(p => filters.stars.includes(p.stars));
    }
    // Property type filter
    if (filters.propertyType.length > 0) {
      results = results.filter(p => filters.propertyType.includes(p.propertyType));
    }
    // Guest rating filter
    if (filters.guestRating > 0) {
      results = results.filter(p => p.rating >= filters.guestRating);
    }

    // Sort
    switch (sortBy) {
      case 'price-low': results.sort((a, b) => a.pricePerNight - b.pricePerNight); break;
      case 'price-high': results.sort((a, b) => b.pricePerNight - a.pricePerNight); break;
      case 'rating': results.sort((a, b) => b.rating - a.rating); break;
      case 'stars': results.sort((a, b) => b.stars - a.stars); break;
      default: results.sort((a, b) => b.popularityScore - a.popularityScore); break;
    }

    return results;
  }, [filters, sortBy, currentLocation]);

  const toggleFilter = (type: 'stars' | 'propertyType', value: number | string) => {
    setFilters(prev => {
      const arr = (prev[type] as any[]).includes(value) ? (prev[type] as any[]).filter((v: any) => v !== value) : [...(prev[type] as any[]), value];
      return { ...prev, [type]: arr };
    });
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-main)' } as React.CSSProperties}>
      {/* Sidebar Filters */}
      <aside style={{
        width: '280px',
        background: 'var(--bg-card)',
        padding: '2rem',
        borderRight: '1px solid #e0e0e0',
        overflowY: 'auto',
        display: showFilters ? 'block' : 'none',
        position: 'fixed',
        top: 0,
        left: 0,
        height: '100vh',
        zIndex: 100,
        boxShadow: '2px 0 12px rgba(0,0,0,0.1)',
        transition: 'transform 0.3s ease'
      } as React.CSSProperties}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' } as React.CSSProperties}>
          <h3 style={{ margin: 0, color: 'var(--primary-color)', fontSize: '1.4rem', fontWeight: 400 } as React.CSSProperties}>Filters</h3>
          <button onClick={() => setShowFilters(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: '#666' } as React.CSSProperties}>✕</button>
        </div>

        <div style={{ marginBottom: '2rem' } as React.CSSProperties}>
          <h4 style={{ marginBottom: '1rem', color: '#333', fontSize: '0.95rem', fontWeight: 500 } as React.CSSProperties}>Price Range</h4>
          <input type="range" min={50} max={1000} value={filters.maxPrice} onChange={(e) => setFilters(prev => ({ ...prev, maxPrice: Number(e.target.value) }))} style={{ width: '100%', accentColor: 'var(--accent-color)' } as React.CSSProperties} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#666', marginTop: '0.5rem' } as React.CSSProperties}>
            <span>${filters.minPrice}</span>
            <span>${filters.maxPrice}</span>
          </div>
        </div>

        <div style={{ marginBottom: '2rem' } as React.CSSProperties}>
          <h4 style={{ marginBottom: '1rem', color: '#333', fontSize: '0.95rem', fontWeight: 500 } as React.CSSProperties}>Star Rating</h4>
          {[3, 4, 5].map(star => (
            <label key={star} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.6rem', cursor: 'pointer', fontSize: '0.9rem' } as React.CSSProperties}>
              <input type="checkbox" checked={filters.stars.includes(star)} onChange={() => toggleFilter('stars', star)} style={{ accentColor: 'var(--accent-color)' } as React.CSSProperties} />
              <span style={{ color: 'var(--accent-color)' } as React.CSSProperties}>{'★'.repeat(star)}{'☆'.repeat(5 - star)}</span>
            </label>
          ))}
        </div>

        <div style={{ marginBottom: '2rem' } as React.CSSProperties}>
          <h4 style={{ marginBottom: '1rem', color: '#333', fontSize: '0.95rem', fontWeight: 500 } as React.CSSProperties}>Property Type</h4>
          {['Hotel', 'Resort', 'Villa', 'Apartment'].map(type => (
            <label key={type} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.6rem', cursor: 'pointer', fontSize: '0.9rem' } as React.CSSProperties}>
              <input type="checkbox" checked={filters.propertyType.includes(type)} onChange={() => toggleFilter('propertyType', type)} style={{ accentColor: 'var(--accent-color)' } as React.CSSProperties} />
              <span>{type}</span>
            </label>
          ))}
        </div>

        <div>
          <h4 style={{ marginBottom: '1rem', color: '#333', fontSize: '0.95rem', fontWeight: 500 } as React.CSSProperties}>Guest Rating</h4>
          {[3, 4, 4.5].map(rating => (
            <button key={rating} onClick={() => setFilters(prev => ({ ...prev, guestRating: rating }))} style={{
              display: 'block',
              width: '100%',
              padding: '0.6rem 0.8rem',
              marginBottom: '0.4rem',
              border: filters.guestRating === rating ? '1px solid #c5a059' : '1px solid #e0e0e0',
              background: filters.guestRating === rating ? '#fff8e1' : 'var(--bg-card)',
              cursor: 'pointer',
              borderRadius: '4px',
              textAlign: 'left',
              fontSize: '0.9rem',
              color: '#333',
              transition: 'all 0.2s'
            } as React.CSSProperties}>
              {rating}+ Stars
            </button>
          ))}
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, padding: '2rem', marginLeft: showFilters ? '280px' : '0', transition: 'margin-left 0.3s ease' } as React.CSSProperties}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' } as React.CSSProperties}>
          <h2 style={{ margin: 0, color: 'var(--primary-color)', fontSize: '1.8rem', fontWeight: 300, letterSpacing: '0.5px' } as React.CSSProperties}>Results in {currentLocation}</h2>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' } as React.CSSProperties}>
            <button onClick={() => setShowFilters(!showFilters)} style={{ padding: '0.6rem 1.2rem', border: '1px solid #d0d0d0', background: 'var(--bg-card)', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: '#333' } as React.CSSProperties}>
              <Filter size={16} /> Filters
            </button>
            <div style={{ position: 'relative' } as React.CSSProperties}>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ padding: '0.6rem 2.5rem 0.6rem 1rem', border: '1px solid #d0d0d0', borderRadius: '4px', background: 'var(--bg-card)', fontSize: '0.9rem', color: '#333', appearance: 'none', cursor: 'pointer' } as React.CSSProperties}>
                <option value="recommended">Recommended by Popularity</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="rating">Guest Rating</option>
                <option value="stars">Star Rating</option>
              </select>
              <ChevronDown size={14} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#666' } as React.CSSProperties} />
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '2rem' } as React.CSSProperties}>
          {filteredProperties.map(property => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>
      </main>
    </div>
  );
};

export default SearchResults;
