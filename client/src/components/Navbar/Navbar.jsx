import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './Navbar.css';

export const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="nav">
      <div className='container'>
        <div className="navbar">
          <div className="nav-logo">
            <Link to="/"><h1>Artmart</h1></Link>
          </div>

          {/* Hamburger Icon */}
          <div className="hamburger" onClick={() => setMenuOpen(!menuOpen)}>
            ☰
          </div>

          {/* Navigation Links */}
          <div className={`nav-links ${menuOpen ? "open" : ""}`}>
            <ul>
              <Link to='/all-auctions'><li onClick={() => setMenuOpen(false)}>Auctions</li></Link>
              <Link to='/catalog'><li onClick={() => setMenuOpen(false)}>Catalog</li></Link>
              <Link to='/contact'><li onClick={() => setMenuOpen(false)}>Contact</li></Link>
              <Link to='/resource'><li onClick={() => setMenuOpen(false)}>Resource</li></Link>
            </ul>
            <div className="nav-logs">
            <Link to="/myaccount">
              <button className='primary-btn' onClick={() => setMenuOpen(false)}>My Account</button>
            </Link>
          </div>
          </div>

          {/* My Account Button */}
         
        </div>
      </div>
    </div>
  );
}
