import React from 'react';
import type { Property } from '../types';
import { useNavigate } from 'react-router-dom';
import { Star, MapPin } from 'lucide-react';

interface Props {
  property: Property;
}

export const PropertyCard: React.FC<Props> = ({ property }) => {
  const navigate = useNavigate();

  return (
    <div 
      className="card property-card-row" 
      style={{ cursor: 'pointer', minHeight: '240px' }} 
      onClick={() => navigate(`/property/${property.id}`)}
    >
      <div className="property-card-image">
        <img 
          src={property.images[0]} 
          alt={property.name} 
          style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s' }}
        />
      </div>
      <div className="flex property-card-content" style={{ flexDirection: 'column', justifyContent: 'space-between', padding: '24px' }}>
        <div>
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-serif" style={{ fontSize: '1.4rem', color: 'var(--primary-color)' }}>{property.name}</h3>
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star 
                  key={i} 
                  size={12} 
                  fill={i < property.stars ? "var(--accent-color)" : "transparent"} 
                  color={i < property.stars ? "var(--accent-color)" : "var(--border-color)"} 
                />
              ))}
              <span style={{ fontWeight: 600, marginLeft: '8px' }}>{property.rating}</span>
            </div>
          </div>
          <div className="flex items-center gap-4 mb-4" style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            <div className="flex items-center gap-1">
              <MapPin size={14} /> {property.location}
            </div>
            <div className="flex items-center gap-1">
              <span className="badge" style={{ padding: '2px 8px', fontSize: '0.7rem' }}>{property.propertyType}</span>
            </div>
            <span>•</span>
            <span>{property.distanceFromCenter}km from center</span>
          </div>
          <p style={{ color: 'var(--text-main)', fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
            {property.description}
          </p>
          <div className="flex gap-2 mt-4" style={{ flexWrap: 'wrap' }}>
            {property.amenities.slice(0, 3).map((amenity, idx) => (
              <span key={idx} className="badge" style={{ backgroundColor: 'var(--bg-card-hover)', color: 'var(--text-muted)', border: '1px solid var(--border-color)', fontSize: '0.75rem' }}>
                {amenity}
              </span>
            ))}
            {property.amenities.length > 3 && (
              <span className="badge" style={{ backgroundColor: 'var(--bg-card-hover)', color: 'var(--text-muted)', border: '1px solid var(--border-color)', fontSize: '0.75rem' }}>
                +{property.amenities.length - 3} more
              </span>
            )}
          </div>
        </div>
        <div className="flex justify-between items-end mt-4">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {property.freeCancellation && (
              <span style={{ color: '#2ecc71', fontSize: '0.8rem', fontWeight: 600 }}>✓ Free cancellation</span>
            )}
            {property.breakfastIncluded && (
              <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>☕ Breakfast included</span>
            )}
            <div style={{ marginTop: '8px' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Starting from</span>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary-color)' }}>${property.pricePerNight} <span style={{ fontSize: '0.9rem', fontWeight: 400, color: 'var(--text-muted)' }}>/ night</span></div>
            </div>
          </div>
          <button className="btn btn-primary" style={{ padding: '8px 20px' }}>View Details</button>
        </div>
      </div>
    </div>
  );
};
