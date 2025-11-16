import React from 'react';

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
        <a href="/" style={{ color: 'white', marginRight: '20px' }}>Home</a>
        <a href="/venues" style={{ color: 'white', marginRight: '20px' }}>Venues</a>
        <a href="/tournaments" style={{ color: 'white', marginRight: '20px' }}>Tournaments</a>
        <a href="/about" style={{ color: 'white' }}>About</a>
      </div>
    </div>
  );
};

export default SimpleNavbar;