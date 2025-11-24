
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { Venue } from "@/hooks/useVenueSearch";
import { motion } from "framer-motion";

const VenueCard = ({ venue }: { venue: Venue }) => {
  // Check for required fields and provide defaults if needed
  const renderVenue = {
    ...venue,
    location: venue.location || venue.city || "",
    priceRange: venue.priceRange || venue.price_range || "$10-20/hr",
    amenities: venue.amenities || [],
    openNow: venue.openNow !== undefined ? venue.openNow : true,
    image: venue.image_url || "https://via.placeholder.com/300x150?text=Gaming+Venue"
  };

  return (
    <motion.div 
      className="card-esports hover-lift rounded-lg overflow-hidden group"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
    >
      <div className="relative overflow-hidden">
        <motion.img 
          src={renderVenue.image} 
          alt={renderVenue.name} 
          className="h-48 w-full object-cover"
          whileHover={{ scale: 1.1 }}
          transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        />
        <Badge 
          className={`absolute top-3 right-3 ${renderVenue.openNow ? 'bg-gaming-green' : 'bg-gaming-gray'}`}
        >
          {renderVenue.openNow ? 'Open Now' : 'Closed'}
        </Badge>
      </div>
      
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-white font-bold text-lg line-clamp-1">{renderVenue.name}</h3>
          <div className="flex items-center bg-gaming-dark/90 px-2 py-1 rounded text-sm">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-yellow-400 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span className="text-white">{renderVenue.rating}</span>
          </div>
        </div>
        
        <p className="text-gray-400 text-sm mb-3 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {renderVenue.location}
        </p>
        
        <div className="flex flex-wrap gap-1 mb-3">
          {renderVenue.amenities.slice(0, 3).map((amenity, index) => (
            <Badge key={index} variant="secondary" className="bg-gaming-gray/30 text-white text-xs">
              {amenity}
            </Badge>
          ))}
          {renderVenue.amenities.length > 3 && (
            <Badge variant="secondary" className="bg-gaming-gray/30 text-white text-xs">
              +{renderVenue.amenities.length - 3} more
            </Badge>
          )}
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-gaming-purple font-medium">{renderVenue.priceRange}</span>
          <Button variant="outline" size="sm" className="btn-esports-green" asChild>
            <Link to={`/venues/details/${renderVenue.id}`}>
              <Eye size={16} className="mr-1" />
              View
            </Link>
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

export default VenueCard;
