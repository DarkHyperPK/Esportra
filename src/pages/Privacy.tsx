import React from 'react';
import Footer from '@/components/Footer';

const PrivacyPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-esports-dark text-white">
      <main className="container mx-auto px-4 py-12 max-w-3xl">
        <h1 className="text-4xl font-extrabold mb-4">Privacy Policy</h1>
        <p className="text-gray-400 mb-8">We respect your privacy. This page outlines how Esportra collects, uses, and protects your data.</p>
        <div className="space-y-6 text-gray-300">
          <section>
            <h2 className="text-xl font-bold mb-2">Information We Collect</h2>
            <p>Account info (email, username), profile details you provide, and usage data to improve the service.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold mb-2">How We Use It</h2>
            <p>To deliver core features (auth, teams, tournaments), keep accounts secure, and improve performance.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold mb-2">Your Choices</h2>
            <p>You can update/delete your profile data, and request export or deletion via support.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold mb-2">Contact</h2>
            <p>Questions? Email support@esportra.com.</p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PrivacyPage;


