import React, { useMemo, useState } from 'react';
import { useBooking } from '../context/BookingContext';
import mockData from '../data/mockData.json';
import { PropertyCard } from '../components/PropertyCard';
import type { Property } from '../types';

export const SearchResults: React.FC = () => {
  const { searchCriteria } = useBooking();
  const [maxPrice, setMaxPrice] = useState(1000);
  const [minRating, setMinRating] = useState(0);
  const [selectedStars, setSelectedStars] = useState<number[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('recommended');

  const filteredProperties = useMemo(() => {
    let props = [...mockData.properties] as Property[];
    
    // Search location filter
    if (searchCriteria?.location) {
      props = props.filter(p => p.location.toLowerCase() === searchCriteria.location.toLowerCase());
    }
    
    // Price filter
    props = props.filter(p => p.pricePerNight <= maxPrice);
    
    // Rating filter
    props = props.filter(p => p.rating >= minRating);
    
    // Star rating filter
    if (selectedStars.length > 0) {
      props = props.filter(p => selectedStars.includes(p.stars));
    }
    
    // Property Type filter
    if (selectedTypes.length > 0) {
      props = props.filter(p => selectedTypes.includes(p.propertyType));
    }

    // Sorting logic
    props.sort((a, b) => {
      switch (sortBy) {
        case 'price_low': return a.pricePerNight - b.pricePerNight;
        case 'price_high': return b.pricePerNight - a.pricePerNight;
        case 'rating': return b.rating - a.rating;
        case 'stars': return b.stars - a.stars;
        case 'distance': return a.distanceFromCenter - b.distanceFromCenter;
        case 'recommended':
        default:
          return b.popularityScore - a.popularityScore;
      }
    });

    return props;
  }, [searchCriteria, maxPrice, minRating, selectedStars, selectedTypes, sortBy]);

  return (
    <div className="page-wrapper container section-md">
      <div className="flex-mobile-column justify-between items-end mb-6 gap-4">
        <div>
          <h1 className="font-serif text-gradient" style={{ fontSize: '2rem' }}>
            Properties in {searchCriteria?.location || 'Any Location'}
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>
            {filteredProperties.length} {filteredProperties.length === 1 ? 'property' : 'properties'} found
            {searchCriteria?.checkIn && ` for ${searchCriteria.checkIn} to ${searchCriteria.checkOut}`}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Sort by:</label>
          <select 
            className="input-field" 
            style={{ width: 'auto', padding: '10px 16px', fontSize: '0.9rem' }}
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="recommended">Recommended</option>
            <option value="price_low">Price: Low to High</option>
            <option value="price_high">Price: High to Low</option>
            <option value="rating">Guest Rating</option>
            <option value="stars">Star Rating</option>
            <option value="distance">Distance from Center</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filters Panel */}
        <div className="lg:col-span-1">
          <div className="card" style={{ padding: '24px', position: 'sticky', top: '100px', zIndex: 10 }}>
            <h3 className="font-serif mb-4" style={{ fontSize: '1.2rem' }}>Filters</h3>
            
            <div className="mb-6">
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Max Price: ${maxPrice}</label>
              <input 
                type="range" 
                min="50" 
                max="1000" 
                step="10" 
                value={maxPrice} 
                onChange={(e) => setMaxPrice(parseInt(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--accent-color)' }}
              />
            </div>
            
            <div className="mb-6">
              <label style={{ display: 'block', marginBottom: '12px', fontWeight: 600 }}>Star Rating</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[5, 4, 3].map(s => (
                  <label key={s} className="flex items-center gap-2 cursor-pointer" style={{ fontSize: '0.95rem' }}>
                    <input 
                      type="checkbox" 
                      style={{ width: '18px', height: '18px', accentColor: 'var(--accent-color)' }}
                      checked={selectedStars.includes(s)}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedStars([...selectedStars, s]);
                        else setSelectedStars(selectedStars.filter(v => v !== s));
                      }}
                    />
                    {s} Stars
                  </label>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <label style={{ display: 'block', marginBottom: '12px', fontWeight: 600 }}>Property Type</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {["Hotel", "Resort", "Apartment", "Villa"].map(t => (
                  <label key={t} className="flex items-center gap-2 cursor-pointer" style={{ fontSize: '0.95rem' }}>
                    <input 
                      type="checkbox" 
                      style={{ width: '18px', height: '18px', accentColor: 'var(--accent-color)' }}
                      checked={selectedTypes.includes(t)}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedTypes([...selectedTypes, t]);
                        else setSelectedTypes(selectedTypes.filter(v => v !== t));
                      }}
                    />
                    {t}
                  </label>
                ))}
              </div>
            </div>
            
            <div className="mb-6">
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Minimum Guest Rating</label>
              <div className="flex gap-2">
                {[3, 4, 4.5].map(rating => (
                  <button 
                    key={rating}
                    className={`btn ${minRating === rating ? 'btn-primary' : 'btn-outline'}`}
                    style={{ flex: 1, padding: '8px 4px', fontSize: '0.9rem', borderRadius: '8px' }}
                    onClick={() => setMinRating(minRating === rating ? 0 : rating)}
                  >
                    {rating}+
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Results List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }} className="lg:col-span-3">
          {filteredProperties.length > 0 ? (
            filteredProperties.map(property => (
              <PropertyCard key={property.id} property={property} />
            ))
          ) : (
             <div className="card" style={{ padding: '40px', textAlign: 'center', gridColumn: 'span 3' }}>
               <h3 className="font-serif mb-2" style={{ fontSize: '1.5rem', color: 'var(--text-muted)' }}>No properties found</h3>
               <p>Try adjusting your search filters or changing locations.</p>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};
