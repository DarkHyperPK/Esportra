import React from 'react';

const TestNavbar = () => {
  console.log('TestNavbar rendering...');
  
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
      justifyContent: 'center',
      zIndex: 9999,
      fontSize: '20px',
      fontWeight: 'bold'
    }}>
      TEST NAVBAR - IF YOU SEE THIS, NAVBAR IS WORKING
    </div>
  );
};

export default TestNavbar;