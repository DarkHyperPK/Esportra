
import React from 'react';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Smartphone } from 'lucide-react';

const AppDownloadPage = () => {
  return (
    <div className="min-h-screen bg-esports-dark text-white flex flex-col">
      <main className="flex-grow container mx-auto px-4 py-8 text-center">
        <h1 className="text-3xl font-bold mb-6">Download GamerSpot App</h1>
        <div className="flex justify-center space-x-4 mb-8">
          <Button className="bg-gaming-purple hover:bg-gaming-purple/80">
            <Smartphone className="mr-2" /> Download for iOS
          </Button>
          <Button className="bg-gaming-blue hover:bg-gaming-blue/80">
            <Smartphone className="mr-2" /> Download for Android
          </Button>
        </div>
        <p>Coming soon to App Store and Google Play Store!</p>
      </main>
      <Footer />
    </div>
  );
};

export default AppDownloadPage;
