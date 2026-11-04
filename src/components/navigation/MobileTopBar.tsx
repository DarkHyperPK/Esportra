import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { getWebsiteAssetUrl } from '@/lib/storage';
import { JackButton } from '@/components/ui/JackButton';
import UserMenu from './UserMenu';
import { NotificationSidebar } from '../notifications/NotificationSidebar';
import './mobile-top-bar.css';

/**
 * Phone and tablet top bar (below lg, where the sidebar is hidden): the logo mark,
 * notifications and the account menu, or Log in / Sign up when signed out.
 * The bottom rail carries navigation; this bar carries identity.
 */
export function MobileTopBar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  async function handleSignOut() {
    try {
      await signOut();
      navigate('/auth/signin');
    } catch {
      toast({ title: 'Error signing out', description: 'Please try again later', variant: 'destructive' });
    }
  }

  return (
    <header className="mobile-top-bar lg:hidden">
      <Link to="/" aria-label="Esportra home" className="mobile-top-bar-brand">
        <img src={getWebsiteAssetUrl('eSportra-Logo/eSPORTRA-white-transparent.png')} alt="" width={30} height={30} />
      </Link>
      <div className="mobile-top-bar-actions">
        {user ? (
          <>
            <NotificationSidebar className="mobile-top-bar-icon relative flex h-10 w-10 items-center justify-center border-0 bg-transparent p-0 text-zinc-400 transition-colors hover:text-white" />
            <UserMenu handleSignOut={handleSignOut} compact panelAlign="end" panelWidth={288} />
          </>
        ) : (
          <>
            <Link to="/auth/signin" className="mobile-top-bar-login">Log in</Link>
            <JackButton as={Link} to="/auth/signup" size="sm">Sign up</JackButton>
          </>
        )}
      </div>
    </header>
  );
}
