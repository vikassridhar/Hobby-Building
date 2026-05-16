import { Plane } from 'lucide-react';
import { Link } from 'react-router-dom';

const Navbar = () => {
  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="logo">
          <Plane size={24} />
          <span>AuraTravel</span>
        </Link>
        <div className="navbar-actions">
          <button className="btn btn-outline btn-sm">EN</button>
          <Link to="/signin" className="btn btn-primary btn-sm">Sign In</Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
