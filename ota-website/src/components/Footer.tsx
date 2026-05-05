import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer style={{ backgroundColor: '#0d1b2a', color: '#fff', padding: '60px 0 30px' }}>
      <div className="container" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '30px', marginBottom: '40px' }}>
        <div style={{ maxWidth: '300px' }}>
          <h2 style={{ fontSize: '1.5rem', fontFamily: 'var(--font-serif)', color: '#e0a96d', marginBottom: '16px' }}>AuraTravel</h2>
          <p style={{ color: '#a0aec0', fontSize: '0.95rem' }}>Experience the most luxurious destinations worldwide. Premium stays for the modern traveler.</p>
        </div>
        <div style={{ display: 'flex', gap: '60px', flexWrap: 'wrap' }}>
          <div>
            <h3 style={{ marginBottom: '16px', fontSize: '1.1rem' }}>Company</h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <li><a href="#" style={{ color: '#a0aec0', transition: 'color 0.2s' }}>About Us</a></li>
              <li><a href="#" style={{ color: '#a0aec0', transition: 'color 0.2s' }}>Careers</a></li>
              <li><a href="#" style={{ color: '#a0aec0', transition: 'color 0.2s' }}>Press</a></li>
            </ul>
          </div>
          <div>
            <h3 style={{ marginBottom: '16px', fontSize: '1.1rem' }}>Support</h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <li><a href="#" style={{ color: '#a0aec0', transition: 'color 0.2s' }}>Contact</a></li>
              <li><a href="#" style={{ color: '#a0aec0', transition: 'color 0.2s' }}>FAQ</a></li>
              <li><a href="#" style={{ color: '#a0aec0', transition: 'color 0.2s' }}>Terms of Service</a></li>
            </ul>
          </div>
        </div>
      </div>
      <div className="container" style={{ borderTop: '1px solid #1b263b', paddingTop: '30px', textAlign: 'center', color: '#6c757d', fontSize: '0.9rem' }}>
        &copy; {new Date().getFullYear()} AuraTravel. All rights reserved.
      </div>
    </footer>
  );
};
