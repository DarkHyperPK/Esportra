import React from 'react';
import Footer from '@/components/Footer';

const CareersPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-esports-dark text-white">
      <main className="container mx-auto px-4 py-12 max-w-5xl">
        <h1 className="text-4xl font-extrabold mb-4">Careers at Esportra</h1>
        <p className="text-gray-400 mb-8">Join us to build the best esports tournament platform.</p>
        <div className="grid md:grid-cols-2 gap-6 text-gray-300">
          <div className="bg-gaming-dark border border-gaming-gray/30 rounded-xl p-6">
            <h2 className="text-xl font-bold mb-2">Frontend Engineer</h2>
            <p className="mb-4">React/TypeScript, UI polish, accessibility, and performance.</p>
            <p className="text-sm text-gray-400">Apply: jobs@esportra.com</p>
          </div>
          <div className="bg-gaming-dark border border-gaming-gray/30 rounded-xl p-6">
            <h2 className="text-xl font-bold mb-2">Backend Engineer</h2>
            <p className="mb-4">Node/Supabase, RLS-first design, reliability, observability.</p>
            <p className="text-sm text-gray-400">Apply: jobs@esportra.com</p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CareersPage;


