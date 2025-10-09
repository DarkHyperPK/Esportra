import React from 'react';
import { motion } from 'framer-motion';

const SponsorsBanner = () => {
  return (
    <section className="py-16 bg-gaming-dark">
      <div className="container mx-auto px-4">
        <motion.div 
          className="text-center mb-10"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Our <span className="text-gradient">Partners</span>
          </h2>
          <p className="text-gray-300 max-w-2xl mx-auto">
            Supported by the best gaming hardware companies in the world
          </p>
        </motion.div>
        
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 gap-8"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <div className="group relative rounded-lg overflow-hidden h-[250px]">
            <div className="absolute inset-0 bg-gradient-to-r from-gaming-darker/90 via-gaming-darker/70 to-transparent z-10"></div>
            <img 
              src="https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80" 
              alt="Logitech Gaming Peripherals" 
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
            <div className="absolute top-0 left-0 w-full h-full flex flex-col justify-center p-8 z-20">
              <h3 className="text-2xl font-bold text-white mb-2">Precision Engineered for Victory</h3>
              <p className="text-gray-200 mb-6 max-w-sm">
                Experience gaming at its finest with award-winning mice, keyboards, headsets and controllers
              </p>
              <a 
                href="https://www.logitech.com" 
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 bg-gaming-purple text-white inline-block rounded-md hover:bg-gaming-purple/80 transition-colors w-fit"
              >
                Explore Logitech G
              </a>
              <div className="absolute top-4 right-4 bg-gaming-purple/70 text-white text-xs px-2 py-1 rounded-md backdrop-blur-sm">
                Official Sponsor
              </div>
            </div>
          </div>
          
          <div className="group relative rounded-lg overflow-hidden h-[250px]">
            <div className="absolute inset-0 bg-gradient-to-r from-gaming-darker/90 via-gaming-darker/70 to-transparent z-10"></div>
            <img 
              src="https://images.unsplash.com/photo-1616588589676-62b3bd4ff6d2?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80" 
              alt="Razer Gaming Gear" 
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
            <div className="absolute top-0 left-0 w-full h-full flex flex-col justify-center p-8 z-20">
              <h3 className="text-2xl font-bold text-white mb-2">For Gamers. By Gamers.</h3>
              <p className="text-gray-200 mb-6 max-w-sm">
                Unleash your gaming potential with Razer's cutting-edge mice, keyboards, and audio solutions
              </p>
              <a 
                href="https://www.razer.com" 
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 bg-gaming-green text-white inline-block rounded-md hover:bg-gaming-green/80 transition-colors w-fit"
              >
                Visit Razer
              </a>
              <div className="absolute top-4 right-4 bg-gaming-green/70 text-white text-xs px-2 py-1 rounded-md backdrop-blur-sm">
                Official Sponsor
              </div>
            </div>
          </div>
        </motion.div>
        
        <motion.div 
          className="mt-12 bg-esports-dark/80 backdrop-blur-sm p-6 rounded-lg border border-gaming-gray/30"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="mb-4 md:mb-0">
              <h3 className="text-xl font-bold mb-2">Exclusive Gaming Gear Discounts</h3>
              <p className="text-gray-300">Get special offers on premium gaming equipment for GamerSpot members</p>
            </div>
            <div className="flex space-x-4">
              <a 
                href="https://www.logitech.com" 
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-gaming-purple text-white rounded hover:bg-gaming-purple/80 transition-colors whitespace-nowrap"
              >
                Logitech 15% OFF
              </a>
              <a 
                href="https://www.razer.com" 
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-gaming-green text-white rounded hover:bg-gaming-green/80 transition-colors whitespace-nowrap"
              >
                Razer 10% OFF
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default SponsorsBanner; 