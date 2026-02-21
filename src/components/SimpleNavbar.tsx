import React from 'react';
import { Link } from 'react-router-dom';

const SimpleNavbar = () => {
  console.log('SIMPLE NAVBAR RENDERING...');
  
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: '60px',
      backgroundColor: 'red',
      color: 'white',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 20px',
      zIndex: 9999,
      fontSize: '18px',
      fontWeight: 'bold'
    }}>
      <div>Esportra</div>
      <div>
        <Link to="/" style={{ color: 'white', marginRight: '20px', textDecoration: 'none' }}>Home</Link>
        <Link to="/venues" style={{ color: 'white', marginRight: '20px', textDecoration: 'none' }}>Venues</Link>
        <Link to="/tournaments" style={{ color: 'white', marginRight: '20px', textDecoration: 'none' }}>Tournaments</Link>
        <Link to="/about" style={{ color: 'white', textDecoration: 'none' }}>About</Link>
      </div>
    </div>
  );
};

export default SimpleNavbar;
