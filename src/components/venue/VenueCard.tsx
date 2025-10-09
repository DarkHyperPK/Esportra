
import { Link } from "react-router-dom";

interface VenueCardProps {
  venue: {
    id: string;
    name: string;
    city: string;
    address: string;
    description: string;
    stations: number;
    hours: string;
    games: string;
    contact_email: string;
    contact_phone: string;
    image_url: string | null;
    price_range?: string;
    rating?: number;
    open_now?: boolean;
  };
}

export function VenueCard({ venue }: VenueCardProps) {
  const defaultImage = "https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?auto=format&fit=crop&w=500&q=80";
  
  return (
    <Link to={`/venues/details/${venue.id}`} className="block h-full">
      <div className="bg-gaming-dark border border-gaming-gray/30 rounded-lg overflow-hidden h-full flex flex-col transition-transform hover:scale-[1.02]">
        <div className="h-48 overflow-hidden">
          <img 
            src={venue.image_url || defaultImage}
            alt={venue.name} 
            className="w-full h-full object-cover"
          />
        </div>
        <div className="p-4 flex-grow">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-lg font-bold">{venue.name}</h3>
            {venue.rating !== undefined && (
              <div className="bg-gaming-purple text-white text-xs rounded-full px-2 py-1 flex items-center">
                ★ {venue.rating}
              </div>
            )}
          </div>
          <p className="text-sm text-gray-400 mb-2">{venue.city}</p>
          <p className="text-sm line-clamp-2 mb-2">{venue.description}</p>
          <div className="text-sm text-gray-400">
            <p>{venue.stations} gaming stations</p>
            <p>{venue.price_range || '$10-20/hr'}</p>
            {venue.open_now !== undefined && (
              <p className={venue.open_now ? "text-green-500" : "text-red-500"}>
                {venue.open_now ? "Open now" : "Closed"}
              </p>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
