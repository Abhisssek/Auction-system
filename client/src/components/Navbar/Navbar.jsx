import React from 'react'
import { Link } from 'react-router-dom'
import './Navbar.css'

export const Navbar = () => {
  return (
    <div className="nav">
    <div className='container'>
        <div className="navbar">
            <div className="nav-logo">
                <Link to="/"><h1>Artmart</h1></Link>
            </div>
            <div className="nav-links">
                <ul>
                    <Link to='/portfolio'><li>Portfolio</li></Link>
                    <Link to='/catalog'><li>Catalog</li></Link>
                    <Link to='/contact'><li>Contact</li></Link>
                    <Link to='/resource'><li>Resource</li></Link>
                </ul>
            </div>
            <div className="nav-logs">
                <Link to="/myaccount"><button className='primary-btn'>My Account</button></Link>
            </div>
        </div>
    </div>
    </div>
  )
}
