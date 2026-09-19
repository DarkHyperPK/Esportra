import React from 'react';

export type ProfileTab = 'overview' | 'history' | 'matches' | 'teams' | 'achievements' | 'stats';

interface ProfileTabBarProps {
  activeTab: ProfileTab;
  onTabChange: (tab: ProfileTab) => void;
  accentColor: string;
}

const TABS: { id: ProfileTab; label: string; shortLabel: string }[] = [
  { id: 'overview', label: 'Overview', shortLabel: 'Overview' },
  { id: 'history', label: 'Tournament History', shortLabel: 'History' },
  { id: 'matches', label: 'Matches', shortLabel: 'Matches' },
  { id: 'teams', label: 'Teams', shortLabel: 'Teams' },
  { id: 'achievements', label: 'Achievements', shortLabel: 'Achievements' },
  { id: 'stats', label: 'Stats', shortLabel: 'Stats' },
];

/**
 * ProfileTabBar: sticky tab navigation.
 * Active tab shows accent-colored underline.
 * Switches tab content via tab-in/tab-out (handled by AnimatePresence in ProfilePage).
 */
export function ProfileTabBar({ activeTab, onTabChange, accentColor }: ProfileTabBarProps): React.JSX.Element {
  return (
    <>
      <style>{`
        .profile-tab-bar {
          position: sticky;
          top: 0;
          background: #0E0E12;
          z-index: 50;
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        .profile-tab-btn {
          position: relative;
          padding: 12px 16px;
          background: none;
          border: none;
          cursor: pointer;
          font-family: Inter, sans-serif;
          font-size: 14px;
          font-weight: 500;
          color: rgba(255,255,255,0.55);
          white-space: nowrap;
          -webkit-tap-highlight-color: transparent;
          outline: none;
          flex-shrink: 0;
        }
        .profile-tab-btn.active {
          font-weight: 600;
          color: #FFFFFF;
        }
        .profile-tab-underline {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 2px;
          border-radius: 1px;
        }
        @media (hover: hover) {
          .profile-tab-btn:not(.active):hover {
            color: rgba(255,255,255,0.75);
          }
        }
      `}</style>

      <nav
        className="profile-tab-bar"
        role="tablist"
        aria-label="Profile sections"
      >
        <div
          style={{
            maxWidth: 1200,
            margin: '0 auto',
            padding: '0 24px',
            display: 'flex',
            overflowX: 'auto',
            scrollbarWidth: 'none',
          }}
        >
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => onTabChange(tab.id)}
                className={`profile-tab-btn${isActive ? ' active' : ''}`}
              >
                {/* Underline is a child of the text span so it spans text width, not button width */}
                <span className="tab-full-label" style={{ position: 'relative', display: 'inline-block' }}>
                  {tab.label}
                  {isActive && (
                    <span
                      className="profile-tab-underline"
                      style={{ background: accentColor }}
                    />
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
