import type { ReactNode } from 'react';
import { Link, NavLink, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight, LayoutDashboard, Monitor, Radio, Users } from 'lucide-react';

export function BroadcastNavigation({ children, focused = false }: { children?: ReactNode; focused?: boolean }) {
  const { showId: routeShowId } = useParams<{ showId: string }>();
  const [params] = useSearchParams();
  const showId = routeShowId || params.get('showId');
  return <div className="broadcast-navigation">
    <Link to="/broadcast/home" className="broadcast-wordmark" aria-label="Esportra Air home">
      <img src="/air-hud/core/brand/mark-224.png" alt="" width="30" height="30" />
      <img className="broadcast-logo-type" src="/air-hud/core/brand/lockup-word.png" alt="Esportra" /><span>Air</span>
    </Link>
    {focused ? <><Link className="broadcast-sidebar-back" to="/broadcast/shows"><ArrowLeft size={14} /> All broadcasts</Link>{children}</> : <>
      <p className="broadcast-nav-label">Workspace</p>
      <nav aria-label="Broadcast navigation">
        <NavLink to="/broadcast/home"><LayoutDashboard size={16} /> Overview</NavLink>
        <NavLink end={!!showId} to="/broadcast/shows"><Radio size={16} /> Broadcasts</NavLink>
        <NavLink to="/broadcast/crew/shows"><Users size={16} /> My assignments</NavLink>
        <NavLink to="/air"><ArrowUpRight size={16} /> Independent projects</NavLink>
      </nav>
      {showId && <><p className="broadcast-nav-label">This broadcast</p><nav className="broadcast-context-nav" aria-label="Broadcast tools">
        {[
          ['/setup', 'Prepare broadcast'], ['', 'Advanced plan'], ['/nodes', 'Desktop connections'],
          ['/crew', 'People'], ['/sponsors', 'Sponsors'], ['/activity', 'Activity'], ['/report', 'Report'],
        ].map(([suffix, label]) => <NavLink key={suffix} end to={`/broadcast/shows/${showId}${suffix}`}>{label}</NavLink>)}
      </nav></>}
    </>}
    <div className="broadcast-sidebar-note"><Monitor size={17} /><div><strong>Produce in Air desktop</strong><p>Prepare here. Control OBS on your production PC.</p></div></div>
  </div>;
}
