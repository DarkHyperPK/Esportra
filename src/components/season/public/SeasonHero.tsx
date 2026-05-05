import { Calendar, MapPin } from 'lucide-react';

interface SeasonHeroProps {
  season: {
    name: string;
    description: string;
    game: string;
    start_date: string;
    end_date: string;
    banner_url: string;
    logo_url: string;
    status: string;
  };
}

export default function SeasonHero({ season }: SeasonHeroProps) {
  const startDate = new Date(season.start_date).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const endDate = new Date(season.end_date).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="relative bg-gradient-to-br from-slate-900 to-slate-800 text-white">
      {/* Banner */}
      {season.banner_url && (
        <div className="absolute inset-0 opacity-30">
          <img
            src={season.banner_url}
            alt={season.name}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <div className="relative container mx-auto px-4 py-16">
        <div className="flex items-start gap-6">
          {/* Logo */}
          {season.logo_url && (
            <img
              src={season.logo_url}
              alt={season.name}
              className="w-24 h-24 rounded-lg object-cover border-2 border-white/20"
            />
          )}

          <div className="flex-1">
            {/* Status Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm mb-4">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-sm font-medium capitalize">{season.status}</span>
            </div>

            {/* Title */}
            <h1 className="text-4xl font-bold mb-2">{season.name}</h1>

            {/* Description */}
            <p className="text-lg text-white/80 mb-6 max-w-2xl">{season.description}</p>

            {/* Meta Info */}
            <div className="flex flex-wrap gap-6 text-sm text-white/70">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>{startDate} - {endDate}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span className="capitalize">{season.game}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
