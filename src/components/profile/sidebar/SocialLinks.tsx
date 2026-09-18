import React from 'react';
import { Twitter, Twitch, Youtube, Instagram } from 'lucide-react';

interface SocialLinksProps {
  socials: {
    twitter?: string | null;
    twitch?: string | null;
    youtube?: string | null;
    instagram?: string | null;
    discord_handle?: string | null;
  };
}

interface SocialEntry {
  platform: string;
  handle: string;
  href: string | null;
  Icon: React.ElementType;
}

/**
 * SocialLinks: renders Twitter, Twitch, YouTube, Instagram, Discord.
 * Discord is display-only (no href).
 * Order: Twitter → Twitch → YouTube → Instagram → Discord.
 */
export function SocialLinks({ socials }: SocialLinksProps): React.JSX.Element | null {
  const entries: SocialEntry[] = [];

  if (socials.twitter) {
    entries.push({
      platform: 'Twitter',
      handle: socials.twitter,
      href: `https://twitter.com/${socials.twitter.replace(/^@/, '')}`,
      Icon: Twitter,
    });
  }
  if (socials.twitch) {
    entries.push({
      platform: 'Twitch',
      handle: socials.twitch,
      href: `https://twitch.tv/${socials.twitch.replace(/^@/, '')}`,
      Icon: Twitch,
    });
  }
  if (socials.youtube) {
    entries.push({
      platform: 'YouTube',
      handle: socials.youtube,
      href: `https://youtube.com/@${socials.youtube.replace(/^@/, '')}`,
      Icon: Youtube,
    });
  }
  if (socials.instagram) {
    entries.push({
      platform: 'Instagram',
      handle: socials.instagram,
      href: `https://instagram.com/${socials.instagram.replace(/^@/, '')}`,
      Icon: Instagram,
    });
  }
  if (socials.discord_handle) {
    entries.push({
      platform: 'Discord',
      handle: socials.discord_handle,
      href: null, // display-only
      Icon: ({ size }: { size?: number }) => (
        <svg width={size ?? 20} height={size ?? 20} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"
            fill="rgba(255,255,255,0.5)"
          />
        </svg>
      ),
    });
  }

  if (entries.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
      {entries.map(({ platform, handle, href, Icon }) => {
        const content = (
          <>
            <Icon size={20} color="rgba(255,255,255,0.5)" />
            <span
              style={{
                fontSize: 13,
                color: 'rgba(255,255,255,0.8)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              className="social-link-handle"
            >
              {handle}
            </span>
          </>
        );

        const rowStyle: React.CSSProperties = {
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          overflow: 'hidden',
        };

        if (href) {
          return (
            <a
              key={platform}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              style={{ ...rowStyle, textDecoration: 'none', color: 'inherit' }}
              className="social-link-row"
            >
              {content}
            </a>
          );
        }

        return (
          <div key={platform} style={rowStyle}>
            {content}
          </div>
        );
      })}

      <style>{`
        @media (hover: hover) {
          .social-link-row:hover .social-link-handle {
            text-decoration: underline;
          }
        }
      `}</style>
    </div>
  );
}
