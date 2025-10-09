import { Link, useNavigate } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import MobileNav from "./navigation/MobileNav";
import DesktopNav from "./navigation/DesktopNav";
import { Bell } from 'lucide-react';
import { useNotifications } from './NotificationContext';
import { useTeamManagement } from '@/hooks/useTeamManagement';
import { Avatar } from '@/components/ui/avatar';
import RoleSwitcher from '@/components/RoleSwitcher';

const Navbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const { signOut, profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead, refreshNotifications } = useNotifications();
  const { acceptTeamInvite, declineTeamInvite, fetchUserTeams } = useTeamManagement();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [processingInvite, setProcessingInvite] = useState<string | null>(null);
  const [processingAction, setProcessingAction] = useState<'accept' | 'reject' | null>(null);
  const ref = useRef(null);
  const dropdownRef = useRef(null);

  // Prevent hydration mismatch and double rendering
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };

    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen]);

  // Handle team invite acceptance
  const handleAcceptInvite = async (notificationId: string) => {
    setProcessingInvite(notificationId);
    setProcessingAction('accept');
    try {
      // Extract invite ID from notification ID (format: "invite-{actualId}")
      const inviteId = notificationId.replace('invite-', '');
      const success = await acceptTeamInvite(inviteId);
      if (success) {
        toast({
          title: 'Invitation Accepted',
          description: 'You have successfully joined the team!',
          variant: 'default',
        });
        // Refresh team data and notifications
        await Promise.all([fetchUserTeams(), refreshNotifications()]);
        setDropdownOpen(false);
      }
    } catch (error) {
      console.error('Error accepting invite:', error);
      toast({
        title: 'Error',
        description: 'Failed to accept invitation',
        variant: 'destructive',
      });
    } finally {
      setProcessingInvite(null);
      setProcessingAction(null);
    }
  };

  // Handle team invite rejection
  const handleRejectInvite = async (notificationId: string) => {
    setProcessingInvite(notificationId);
    setProcessingAction('reject');
    try {
      // Extract invite ID from notification ID (format: "invite-{actualId}")
      const inviteId = notificationId.replace('invite-', '');
      const success = await declineTeamInvite(inviteId);
      if (success) {
        toast({
          title: 'Invitation Declined',
          description: 'You have declined the team invitation',
          variant: 'default',
        });
        // Refresh team data and notifications
        await Promise.all([fetchUserTeams(), refreshNotifications()]);
        setDropdownOpen(false);
      }
    } catch (error) {
      console.error('Error declining invite:', error);
      toast({
        title: 'Error',
        description: 'Failed to decline invitation',
        variant: 'destructive',
      });
    } finally {
      setProcessingInvite(null);
      setProcessingAction(null);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/auth/signin');
    } catch (error) {
      console.error("Error signing out:", error);
      toast({
        title: "Error signing out",
        description: "Please try again later",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (ref.current && !ref.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <nav 
      className="sticky top-0 z-50 font-roboto bg-transparent backdrop-blur-md border-b border-white/10 shadow-lg"
      data-mounted={isMounted}
    >
      <div className="container mx-auto flex justify-between items-center py-3 px-4 relative">
        {/* Logo and Brand */}
        <div className="flex items-center gap-2">
          <Link to="/" className="flex items-center gap-2 select-none">
            <img src="/logo.svg" alt="GamerSpot Logo" className="h-8 w-8" />
            <span className="text-lg font-semibold text-white" style={{ fontFamily: 'Roboto, sans-serif' }}>
              GamerSpot
            </span>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <div className="flex items-center gap-6">
          <DesktopNav handleSignOut={handleSignOut} />
          {/* Notification Bell */}
          <div className="relative">
            <button
              className="relative focus:outline-none p-2 rounded-lg hover:bg-white/10 transition-all duration-200 group"
              onClick={() => setDropdownOpen((open) => !open)}
            >
              <Bell className={`h-6 w-6 text-white transition-all duration-200 group-hover:text-esports-accent group-hover:scale-110 ${unreadCount > 0 ? 'animate-pulse' : ''}`} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-gradient-to-r from-red-500 to-red-600 text-white text-xs font-bold rounded-full px-2 py-1 min-w-[20px] h-5 flex items-center justify-center shadow-lg animate-bounce">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
            {dropdownOpen && (
              <div ref={dropdownRef} className="absolute right-0 mt-2 w-80 bg-esports-dark border border-gray-600/30 rounded-xl shadow-2xl z-50 backdrop-blur-md animate-in slide-in-from-top-2 duration-200">
                <div className="p-4 border-b border-gray-600/20 font-semibold text-esports-primary flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-esports-accent" />
                    Notifications
                    {unreadCount > 0 && (
                      <span className="bg-esports-accent text-white text-xs rounded-full px-2 py-0.5">
                        {unreadCount}
                      </span>
                    )}
                  </div>
                  <Link to="/notifications" className="text-esports-accent text-xs hover:underline transition-colors" onClick={() => setDropdownOpen(false)}>
                    View all
                  </Link>
                </div>
                <div className="max-h-80 overflow-y-auto divide-y divide-gray-600/20">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center">
                      <Bell className="h-8 w-8 text-gray-500 mx-auto mb-2" />
                      <div className="text-gray-400 text-sm">No notifications</div>
                      <div className="text-gray-500 text-xs mt-1">You're all caught up!</div>
                    </div>
                  ) : (
                    notifications.slice(0, 6).map((n) => (
                      <div key={n.id} className={`px-4 py-3 hover:bg-gray-800/50 transition-all duration-200 ${!n.is_read ? 'bg-esports-accent/10 border-l-2 border-esports-accent' : ''}`}>
                        <div className="flex items-start gap-3">
                          {!n.is_read && <span className="w-2 h-2 bg-esports-accent rounded-full mt-2 flex-shrink-0" />}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-esports-primary text-sm">{n.title}</span>
                              {n.type === 'team_invite' && (
                                <span className="bg-esports-blue text-white text-xs px-2 py-0.5 rounded-full">Team Invite</span>
                              )}
                            </div>
                            <div className="text-xs text-esports-secondary mt-1 line-clamp-2">{n.message}</div>
                            <div className="text-xs text-gray-500 mt-2">{new Date(n.created_at).toLocaleString()}</div>
                            {n.type === 'team_invite' && (
                              <div className="flex gap-2 mt-3">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAcceptInvite(n.id);
                                  }}
                                  disabled={processingInvite === n.id}
                                  className="px-3 py-1.5 rounded-lg bg-esports-green text-white text-xs font-medium hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                                >
                                  {processingInvite === n.id && processingAction === 'accept' ? (
                                    <>
                                      <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                                      Accepting...
                                    </>
                                  ) : (
                                    'Accept'
                                  )}
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRejectInvite(n.id);
                                  }}
                                  disabled={processingInvite === n.id}
                                  className="px-3 py-1.5 rounded-lg bg-esports-red text-white text-xs font-medium hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                                >
                                  {processingInvite === n.id && processingAction === 'reject' ? (
                                    <>
                                      <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                                      Rejecting...
                                    </>
                                  ) : (
                                    'Reject'
                                  )}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Navigation */}
        <MobileNav 
          mobileMenuOpen={mobileMenuOpen}
          setMobileMenuOpen={setMobileMenuOpen}
          handleSignOut={handleSignOut}
        />
      </div>
    </nav>
  );
};

export default Navbar;
