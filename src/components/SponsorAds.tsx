import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

interface SponsorAdProps {
  variant?: 'sidebar' | 'banner' | 'featured';
  placement?: 'top' | 'middle' | 'bottom';
}

const SponsorAds: React.FC<SponsorAdProps> = ({ 
  variant = 'banner',
  placement = 'middle'
}) => {
  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.2,
        delayChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { type: "spring", stiffness: 100 }
    }
  };

  // Render different ad styles based on variant prop
  if (variant === 'sidebar') {
    return (
      <motion.div 
        className="mb-6 rounded-lg overflow-hidden"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={containerVariants}
      >
        <h3 className="text-sm text-gray-400 mb-3 uppercase font-medium">Our Sponsors</h3>
        <motion.div
          className="space-y-4"
          variants={containerVariants}
        >
          <motion.div 
            className="bg-gaming-dark p-4 rounded-lg border border-gaming-gray/30 hover:border-gaming-purple/50 transition-all duration-300"
            variants={itemVariants}
            whileHover={{ scale: 1.02 }}
          >
            <a href="https://www.logitech.com" target="_blank" rel="noopener noreferrer" className="block">
              <div className="relative h-32 overflow-hidden rounded-md mb-3">
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent z-10"></div>
                <img 
                  src="https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80" 
                  alt="Logitech Gaming Gear" 
                  className="object-cover h-full w-full"
                />
              </div>
              <p className="text-sm text-white font-medium">Play Like a Pro with Logitech G</p>
              <p className="text-xs text-gray-400 mt-1">Shop the latest gaming gear</p>
            </a>
          </motion.div>
          
          <motion.div 
            className="bg-gaming-dark p-4 rounded-lg border border-gaming-gray/30 hover:border-gaming-green/50 transition-all duration-300"
            variants={itemVariants}
            whileHover={{ scale: 1.02 }}
          >
            <a href="https://www.razer.com" target="_blank" rel="noopener noreferrer" className="block">
              <div className="relative h-32 overflow-hidden rounded-md mb-3">
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent z-10"></div>
                <img 
                  src="https://images.unsplash.com/photo-1616588589676-62b3bd4ff6d2?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80" 
                  alt="Razer Gaming Peripherals" 
                  className="object-cover h-full w-full"
                />
              </div>
              <p className="text-sm text-white font-medium">For Gamers. By Gamers.</p>
              <p className="text-xs text-gray-400 mt-1">Dominate with Razer gear</p>
            </a>
          </motion.div>
        </motion.div>
      </motion.div>
    );
  }

  if (variant === 'featured') {
    return (
      <motion.div 
        className="mb-12"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={containerVariants}
      >
        <h2 className="text-2xl font-bold mb-6">Our <span className="text-gradient">Sponsors</span></h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <motion.div 
            className="relative rounded-xl overflow-hidden h-[220px] group"
            variants={itemVariants}
            whileHover={{ y: -5 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <a href="https://www.logitech.com" target="_blank" rel="noopener noreferrer" className="block h-full">
              <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-transparent z-10"></div>
              <img 
                src="https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80" 
                alt="Logitech Gaming Gear" 
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute top-6 left-6 z-20">
                <h3 className="text-2xl font-bold text-white mb-2">PLAY ADVANCED</h3>
                <p className="text-gray-200 max-w-xs">Experience precision with Logitech G PRO Wireless gaming gear</p>
                <button className="mt-4 px-4 py-2 bg-gaming-purple text-white rounded-md hover:bg-gaming-purple/80 transition-colors">
                  Shop Now
                </button>
              </div>
            </a>
          </motion.div>
          
          <motion.div 
            className="relative rounded-xl overflow-hidden h-[220px] group"
            variants={itemVariants}
            whileHover={{ y: -5 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <a href="https://www.razer.com" target="_blank" rel="noopener noreferrer" className="block h-full">
              <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-transparent z-10"></div>
              <img 
                src="https://images.unsplash.com/photo-1616588589676-62b3bd4ff6d2?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80" 
                alt="Razer Gaming Peripherals" 
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute top-6 left-6 z-20">
                <h3 className="text-2xl font-bold text-white mb-2">WIN WITH RAZER</h3>
                <p className="text-gray-200 max-w-xs">Elevate your game with Razer's premium gaming peripherals</p>
                <button className="mt-4 px-4 py-2 bg-gaming-green text-white rounded-md hover:bg-gaming-green/80 transition-colors">
                  Shop Now
                </button>
              </div>
            </a>
          </motion.div>
        </div>
      </motion.div>
    );
  }

  // Default banner style
  return (
    <motion.div 
      className="my-8 relative overflow-hidden rounded-lg"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      variants={containerVariants}
    >
      <div className="py-4 px-6 bg-esports-dark border border-gaming-gray/30 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <motion.div variants={itemVariants}>
              <p className="text-white font-medium">Official Sponsors of the GamerSpot Gaming Platform</p>
            </motion.div>
          </div>
          <motion.div variants={itemVariants}>
            <div className="flex space-x-4">
              <a 
                href="https://www.logitech.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="px-3 py-1.5 bg-gaming-purple text-white text-sm rounded hover:bg-gaming-purple/80 transition-colors"
              >
                Logitech Deals
              </a>
              <a 
                href="https://www.razer.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="px-3 py-1.5 bg-gaming-green text-white text-sm rounded hover:bg-gaming-green/80 transition-colors"
              >
                Razer Store
              </a>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};

export default SponsorAds; 