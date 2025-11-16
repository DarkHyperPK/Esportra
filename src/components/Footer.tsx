
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="bg-esports-dark border-t border-gray-600/30 pt-12 pb-8">
      <div className="container mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <img src="/logo.svg" alt="Esportra Logo" className="h-8 w-8" />
              <span className="text-xl font-bold text-white">Esportra</span>
            </div>
            <p className="text-gray-400 mb-4">
              The ultimate platform for discovering gaming venues and joining esports tournaments.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-400 hover:text-esports-accent">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
                </svg>
              </a>
              <a href="#" className="text-gray-400 hover:text-esports-accent">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path>
                </svg>
              </a>
              <a href="#" className="text-gray-400 hover:text-esports-accent">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                </svg>
              </a>
              <a href="#" className="text-gray-400 hover:text-esports-accent">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path>
                  <rect x="2" y="9" width="4" height="12"></rect>
                  <circle cx="4" cy="4" r="2"></circle>
                </svg>
              </a>
            </div>
          </div>
          
          <div>
            <h3 className="text-white font-bold mb-4">Platform</h3>
            <ul className="space-y-2">
              <li><Link to="/venues" className="text-gray-400 hover:text-esports-accent">Gaming Venues</Link></li>
              <li><Link to="/tournaments" className="text-gray-400 hover:text-esports-accent">Tournaments</Link></li>
              <li><Link to="/teams" className="text-gray-400 hover:text-esports-accent">Teams</Link></li>
              <li><Link to="/players" className="text-gray-400 hover:text-esports-accent">Players</Link></li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-white font-bold mb-4">Resources</h3>
            <ul className="space-y-2">
              <li><Link to="/for-venues" className="text-gray-400 hover:text-gaming-purple">For Venue Owners</Link></li>
              <li><Link to="/for-organizers" className="text-gray-400 hover:text-gaming-purple">For Tournament Organizers</Link></li>
              <li><Link to="/blog" className="text-gray-400 hover:text-gaming-purple">Blog</Link></li>
              <li><Link to="/faq" className="text-gray-400 hover:text-gaming-purple">FAQ</Link></li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-white font-bold mb-4">Company</h3>
            <ul className="space-y-2">
              <li><Link to="/about" className="text-gray-400 hover:text-gaming-purple">About Us</Link></li>
              <li><Link to="/careers" className="text-gray-400 hover:text-gaming-purple">Careers</Link></li>
              <li><Link to="/contact" className="text-gray-400 hover:text-gaming-purple">Contact</Link></li>
              <li><Link to="/privacy" className="text-gray-400 hover:text-gaming-purple">Privacy Policy</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gaming-gray/30 mt-10 pt-6 text-center">
          <p className="text-gray-400">© {new Date().getFullYear()} Esportra. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
