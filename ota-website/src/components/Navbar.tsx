import React from 'react';
import { Link } from 'react-router-dom';
import { Plane, User, Globe } from 'lucide-react';

export const Navbar: React.FC = () => {
  return (
    <nav className="navbar">
      <div className="container navbar-container">
        <Link to="/" className="logo">
          <Plane className="logo-icon" size={28} />
          <span>AuraTravel</span>
        </Link>
        <div className="flex items-center gap-6">
          <button className="btn btn-ghost flex items-center gap-2">
            <Globe size={18} /> EN
          </button>
          <button className="btn btn-outline flex items-center gap-2">
            <User size={18} /> Sign In
          </button>
        </div>
      </div>
    </nav>
  );
};
