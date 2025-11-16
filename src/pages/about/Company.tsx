import React from 'react';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import FeaturesSection from '@/components/FeaturesSection';
import { Users, MapPin, Trophy } from 'lucide-react';

const stats = [
  {
    label: 'Gaming Venues',
    value: '200+',
    image: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=600&q=80',
    icon: <MapPin className="h-8 w-8 text-gaming-purple" />,
  },
  {
    label: 'Active Users',
    value: '50k+',
    image: 'https://images.unsplash.com/photo-1464983953574-0892a716854b?auto=format&fit=crop&w=600&q=80',
    icon: <Users className="h-8 w-8 text-gaming-blue" />,
  },
  {
    label: 'Tournaments Hosted',
    value: '1000+',
    image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80',
    icon: <Trophy className="h-8 w-8 text-gaming-green" />,
  },
];

const AboutCompany = () => {
  return (
    <div className="min-h-screen bg-esports-dark text-white flex flex-col">
      {/* Hero Banner */}
      <div className="relative w-full h-[320px] md:h-[420px] flex items-center justify-center mb-12">
        <img
          src="https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1200&q=80"
          alt="Gaming Hero"
          className="absolute inset-0 w-full h-full object-cover object-center z-0"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-gaming-darker/90 via-gaming-dark/80 to-gaming-darker/60 z-10" />
        <div className="relative z-20 text-center px-4">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4">About Esportra</h1>
          <p className="text-lg md:text-2xl text-gray-300 max-w-2xl mx-auto">
            The complete gaming ecosystem: venues, tournaments, and community—all in one place.
          </p>
        </div>
      </div>

      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto">
          {/* Mission & Vision */}
          <div className="space-y-8 mb-12">
            <section className="prose prose-invert max-w-none">
              <h2 className="text-2xl font-bold mb-4">Our Mission</h2>
              <p className="text-gray-300 mb-6">
                To create the most comprehensive and accessible gaming venue platform, making it easier for gamers to find places to play and compete, while helping gaming venues thrive and grow their communities.
              </p>

              <h2 className="text-2xl font-bold mb-4">Our Vision</h2>
              <p className="text-gray-300 mb-6">
                We envision a world where every gamer can easily find their perfect gaming space and community, whether they're casual players or aspiring esports athletes.
              </p>
            </section>
          </div>

          {/* Visual Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            {stats.map((stat, i) => (
              <div key={i} className="relative rounded-xl overflow-hidden shadow-lg bg-gaming-dark border border-gaming-gray/30 flex flex-col items-center justify-end min-h-[220px]">
                <img
                  src={stat.image}
                  alt={stat.label}
                  className="absolute inset-0 w-full h-full object-cover object-center opacity-30 z-0"
                />
                <div className="absolute inset-0 bg-gaming-dark/70 z-10" />
                <div className="relative z-20 flex flex-col items-center justify-center py-10">
                  <div className="mb-3">{stat.icon}</div>
                  <div className="text-3xl font-bold mb-1">{stat.value}</div>
                  <div className="text-gray-300 text-lg font-medium">{stat.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Features Section with subtle gaming bg */}
          <div className="relative mb-16">
            <div className="absolute inset-0 pointer-events-none select-none opacity-10" style={{backgroundImage: 'url(https://images.unsplash.com/photo-1464983953574-0892a716854b?auto=format&fit=crop&w=1200&q=80)', backgroundSize: 'cover', backgroundPosition: 'center'}} />
            <div className="relative z-10">
              <FeaturesSection />
            </div>
          </div>

          {/* Community/CTA Section */}
          <div className="flex flex-col md:flex-row items-center gap-8 bg-gaming-dark rounded-xl border border-gaming-gray/30 p-8 mb-12">
            <img
              src="https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80"
              alt="Gaming Community"
              className="w-full md:w-1/3 rounded-lg object-cover object-center mb-6 md:mb-0"
              style={{minHeight: 180, maxHeight: 220}}
            />
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-2xl font-bold mb-4">Join Our Community</h2>
              <p className="text-gray-300 mb-6">
                Be part of the fastest-growing gaming community platform. Connect, compete, and level up your gaming experience with GamerSpot.
              </p>
              <Button className="bg-gaming-purple hover:bg-gaming-purple/80">
                Sign Up Now
              </Button>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AboutCompany;
