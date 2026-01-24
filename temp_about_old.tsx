import React from 'react';
import Footer from '@/components/Footer';

const AboutPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-esports-dark text-white">
      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-4xl font-extrabold mb-4">About Esportra</h1>
        <p className="text-gray-400 mb-8">Esportra is a modern esports platform powering team registration, brackets, and match management across games.</p>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-gaming-dark border border-gaming-gray/30 rounded-xl p-6 text-gray-300">Multi-game tournaments</div>
          <div className="bg-gaming-dark border border-gaming-gray/30 rounded-xl p-6 text-gray-300">Teams & roles</div>
          <div className="bg-gaming-dark border border-gaming-gray/30 rounded-xl p-6 text-gray-300">Secure RLS policies</div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AboutPage;


