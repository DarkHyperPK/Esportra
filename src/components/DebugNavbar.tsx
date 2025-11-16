import { Link } from "react-router-dom";

const DebugNavbar = () => {
  console.log("DebugNavbar rendering...");
  
  return (
    <div 
      style={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        backgroundColor: '#1f2937',
        borderBottom: '2px solid #3b82f6',
        padding: '1rem',
        color: 'white',
        fontSize: '18px',
        fontWeight: 'bold'
      }}
    >
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{
            width: '40px',
            height: '40px',
            backgroundColor: '#3b82f6',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 'bold',
            fontSize: '16px'
          }}>
            ES
          </div>
          <span>Esportra - DEBUG NAVBAR</span>
        </div>
        
        <div style={{ display: 'flex', gap: '2rem' }}>
          <Link to="/" style={{ color: '#d1d5db', textDecoration: 'none' }}>Home</Link>
          <Link to="/venues" style={{ color: '#d1d5db', textDecoration: 'none' }}>Venues</Link>
          <Link to="/tournaments" style={{ color: '#d1d5db', textDecoration: 'none' }}>Tournaments</Link>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem' }}>
          <Link to="/auth/signin" style={{ color: '#d1d5db', textDecoration: 'none' }}>Sign In</Link>
          <Link to="/auth/signup" style={{ 
            backgroundColor: '#3b82f6', 
            color: 'white', 
            padding: '0.5rem 1rem', 
            borderRadius: '8px',
            textDecoration: 'none'
          }}>Sign Up</Link>
        </div>
      </div>
    </div>
  );
};

export default DebugNavbar;
