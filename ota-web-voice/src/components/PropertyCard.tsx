import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Star } from 'lucide-react';
import { Property } from '../types';

interface PropertyCardProps {
  property: Property;
}

const PropertyCard: React.FC<PropertyCardProps> = ({ property }) => {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate(`/property/${property.id}`)}
      style={{ background: 'var(--bg-card)', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.06)', cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s' }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.12)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.06)'; }}
    >
      <div style={{ height: '200px', overflow: 'hidden' }}>
        <img src={property.images[0]} alt={property.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
      <div style={{ padding: '1.5rem' }}>
        <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--primary-color)', fontSize: '1.25rem', fontWeight: 700 }}>{property.name}</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#666', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
          <MapPin size={14} /> {property.location}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', marginBottom: '0.5rem' }}>
          {[...Array(property.stars)].map((_, i) => (
            <Star key={i} size={16} fill="#c5a059" color="#c5a059" />
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', fontSize: '0.9rem', color: '#333' }}>
          <span style={{ background: 'var(--accent-color)', color: 'var(--bg-card)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 600 }}>{property.rating}</span>
          <span>•</span>
          <span>{property.reviewsCount} reviews</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1rem', borderTop: '1px solid #f0f0f0' }}>
          <div>
            <span style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--primary-color)' }}>${property.pricePerNight}</span>
            <span style={{ fontSize: '0.9rem', color: '#666' }}> / night</span>
          </div>
          <button
            onClick={() => navigate(`/property/${property.id}`)}
            style={{ padding: '0.6rem 1.2rem', background: 'var(--primary-color)', color: 'var(--bg-card)', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 500, fontSize: '0.9rem' }}
          >
            View Details
          </button>
        </div>
      </div>
    </div>
  );
};

export default PropertyCard;
