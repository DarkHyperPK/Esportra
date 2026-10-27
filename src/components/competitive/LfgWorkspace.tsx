import { useLayoutEffect, useRef, type MouseEvent, type ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import { useLfgReducedMotion } from '@/hooks/competitive/useLfgReducedMotion';
import { CompetitivePageShell } from './CompetitivePageShell';
import './lfg-glass.css';

export function LfgWorkspace({ children }: { children: ReactNode }) {
  const { pathname, search } = useLocation();
  const params = new URLSearchParams(search);
  const game = params.get('game');
  const reduced = useLfgReducedMotion();
  const navRef = useRef<HTMLElement>(null);
  const gameQuery = game ? `?game=${encodeURIComponent(game)}` : '';
  const savedActive = pathname === '/competitive/lfg' && params.get('saved') === '1';
  const discoverActive = pathname === '/competitive/lfg' && !savedActive;
  useLayoutEffect(() => {
    const marker = navRef.current?.querySelector<HTMLElement>('.lfg-nav-marker');
    let previous: { left: number; width: number; time: number } | undefined;
    try { const value = sessionStorage.getItem('lfg-nav-position'); if (value) previous = JSON.parse(value); sessionStorage.removeItem('lfg-nav-position'); } catch { /* Storage is optional. */ }
    if (!marker || !previous || reduced || document.documentElement.dataset.lfgInput === 'keyboard' || Date.now() - previous.time > 1500) return;
    const current = marker.getBoundingClientRect();
    if (!current.width) return;
    const animation = marker.animate([
      { transform: `translateX(${previous.left - current.left}px) scaleX(${previous.width / current.width})` },
      { transform: 'translateX(0) scaleX(1)' },
    ], { duration: 220, easing: 'cubic-bezier(.2, 0, 0, 1)' });
    return () => animation.cancel();
  }, [pathname, reduced]);
  function rememberMarker(event: MouseEvent<HTMLElement>) {
    const target = (event.target as Element).closest('a');
    const marker = navRef.current?.querySelector<HTMLElement>('.lfg-nav-marker');
    if (!target || !marker || !target.pathname.startsWith('/competitive/lfg')) return;
    const rect = marker.getBoundingClientRect();
    try { sessionStorage.setItem('lfg-nav-position', JSON.stringify({ left: rect.left, width: rect.width, time: Date.now() })); } catch { /* Storage is optional. */ }
  }
  return (
    <CompetitivePageShell>
      <div className="lfg-workspace" onKeyDownCapture={() => { document.documentElement.dataset.lfgInput = 'keyboard'; }} onPointerDownCapture={() => { document.documentElement.dataset.lfgInput = 'pointer'; }}>
        <nav ref={navRef} className="lfg-nav" aria-label="Find a group" onClickCapture={rememberMarker}>
          <Link className="lfg-wordmark" to={`/competitive/lfg${gameQuery}`}>LFG<span>.</span></Link>
          <div className="lfg-nav-links">
            <Link to={`/competitive/lfg${gameQuery}`} aria-current={discoverActive ? 'page' : undefined}>Discover{discoverActive && <motion.span className="lfg-nav-marker" layoutId="lfg-nav-marker" transition={{ duration: reduced || document.documentElement.dataset.lfgInput === 'keyboard' ? 0 : .22 }} />}</Link>
            <Link to={`/competitive/lfg?saved=1${game ? `&game=${encodeURIComponent(game)}` : ''}`} aria-current={savedActive ? 'page' : undefined}>Saved{savedActive && <motion.span className="lfg-nav-marker" layoutId="lfg-nav-marker" transition={{ duration: reduced || document.documentElement.dataset.lfgInput === 'keyboard' ? 0 : .22 }} />}</Link>
            <NavLink to={`/competitive/lfg/requests${gameQuery}`}>{({ isActive }) => <>Requests{isActive && <motion.span className="lfg-nav-marker" layoutId="lfg-nav-marker" transition={{ duration: reduced || document.documentElement.dataset.lfgInput === 'keyboard' ? 0 : .22 }} />}</>}</NavLink>
            <NavLink to={`/competitive/lfg/mine${gameQuery}`}>{({ isActive }) => <>My listings{isActive && <motion.span className="lfg-nav-marker" layoutId="lfg-nav-marker" transition={{ duration: reduced || document.documentElement.dataset.lfgInput === 'keyboard' ? 0 : .22 }} />}</>}</NavLink>
            <Link to="/inbox">Inbox</Link>
          </div>
          <Link className="lfg-button lfg-button-primary lfg-create" to={`/competitive/lfg/create${gameQuery}`}><Plus size={16} /> Create listing</Link>
        </nav>
        {children}
      </div>
    </CompetitivePageShell>
  );
}
