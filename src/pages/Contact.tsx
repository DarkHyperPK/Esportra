import React from 'react';
import Footer from '@/components/Footer';

const ContactStandalone: React.FC = () => {
  return (
    <div className="min-h-screen bg-esports-dark text-white">
      <main className="container mx-auto px-4 py-12 max-w-3xl">
        <h1 className="text-4xl font-extrabold mb-4">Contact</h1>
        <p className="text-gray-400 mb-8">Reach out to the Esportra team anytime.</p>
        <div className="bg-gaming-dark border border-gaming-gray/30 rounded-xl p-6 text-gray-300">
          <p>Email: support@esportra.com</p>
          <p className="mt-2">Business: partnerships@esportra.com</p>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ContactStandalone;


