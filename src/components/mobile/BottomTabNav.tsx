import { NavLink, useLocation } from 'react-router-dom';
import { Home, Trophy, MapPin, Bell, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const tabs = [
  { to: '/',             icon: Home,    label: 'Home' },
  { to: '/tournaments',  icon: Trophy,  label: 'Tournaments' },
  { to: '/venues',       icon: MapPin,  label: 'Venues' },
  { to: '/notifications',icon: Bell,    label: 'Alerts' },
  { to: '/user/profile', icon: User,    label: 'Profile' },
];

export function BottomTabNav() {
  const location = useLocation();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10"
      style={{
        background: 'rgba(10,10,10,0.92)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div className="flex items-center justify-around h-[60px] px-2">
        {tabs.map(({ to, icon: Icon, label }) => {
          const isActive = to === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(to);

          return (
            <NavLink
              key={to}
              to={to}
              className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full relative"
            >
              {isActive && (
                <motion.div
                  layoutId="tab-indicator"
                  className="absolute inset-x-1 -top-px h-0.5 bg-rose-500 rounded-full"
                  transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                />
              )}
              <Icon
                size={22}
                className={cn(
                  'transition-colors duration-150',
                  isActive ? 'text-rose-500' : 'text-white/40',
                )}
                strokeWidth={isActive ? 2.2 : 1.6}
              />
              <span
                className={cn(
                  'text-[10px] font-medium transition-colors duration-150',
                  isActive ? 'text-rose-500' : 'text-white/40',
                )}
              >
                {label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
