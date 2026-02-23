// ── Environment URLs ──
const FRONTEND_URL = Deno.env.get('FRONTEND_URL') || 'https://esportra.com';
const PARTNER_URL = Deno.env.get('PARTNER_URL') || 'https://partner.esportra.com';

// ── Branding ──
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || 'https://api.esportra.com';
const LOGO_URL = `${SUPABASE_URL}/storage/v1/object/public/system.assets.website/eSportra-Logo/eSPORTRA-white-transparent.png`;

// ── Base Layout ──
const baseLayout = (content: string, preheader: string = "") => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Esportra</title>
  <style>
    body { margin: 0; padding: 0; background-color: #0a0a0a; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
    .preheader { display: none !important; visibility: hidden; mso-hide: all; font-size: 1px; color: #0a0a0a; line-height: 1px; max-height: 0; max-width: 0; opacity: 0; overflow: hidden; }
  </style>
</head>
<body style="margin:0; padding:0; background-color:#0a0a0a;">
  <span class="preheader">${preheader}</span>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#0a0a0a;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="400" cellspacing="0" cellpadding="0" style="max-width:400px; width:100%;">
          <!-- Logo Header -->
          <tr>
            <td align="center" style="padding-bottom: 32px;">
              <a href="${FRONTEND_URL}" target="_blank" style="text-decoration: none; outline: none; border: none;">
                <img src="${LOGO_URL}" alt="Esportra Logo" width="200" style="display: block; border: 0; outline: none; text-decoration: none;" />
              </a>
            </td>
          </tr>
          <!-- Content Card -->
          <tr>
            <td style="background-color:#111111; border: 1px solid #222222; border-radius: 12px; padding: 40px 32px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top: 32px;">
              <p style="margin:0; font-size:12px; color:#555555; line-height:1.6;">
                &copy; ${new Date().getFullYear()} Esportra. All rights reserved.<br>
                You received this email because you have an account on Esportra.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

// ── Button Component ──
const button = (text: string, url: string) => `
  <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 24px auto;">
    <tr>
      <td style="background: linear-gradient(135deg, #e11d48, #be123c); border-radius: 8px; padding: 14px 32px;">
        <a href="${url}" style="color:#ffffff; text-decoration:none; font-size:14px; font-weight:700; letter-spacing:0.5px; text-transform:uppercase;">${text}</a>
      </td>
    </tr>
  </table>
`;

// ── Info Row ──
const infoRow = (label: string, value: string) => `
  <tr>
    <td style="padding: 8px 0; border-bottom: 1px solid #1a1a1a;">
      <span style="color:#777777; font-size:13px;">${label}</span>
    </td>
    <td style="padding: 8px 0; border-bottom: 1px solid #1a1a1a; text-align:right;">
      <span style="color:#ffffff; font-size:13px; font-weight:600;">${value}</span>
    </td>
  </tr>
`;

// ─────────────────────────────────────────────────────────────
// Template Definitions
// ─────────────────────────────────────────────────────────────

const templates: Record<string, (data: Record<string, unknown>) => EmailTemplate> = {

  // ── Tournament Registration ──
  TOURNAMENT_REGISTRATION: (data) => ({
    subject: `Registered: ${data.tournamentName || "Tournament"} | Esportra`,
    html: baseLayout(`
      <h2 style="margin:0 0 8px; font-size:22px; color:#ffffff; font-weight:700;">You're In! \uD83C\uDFAE</h2>
      <p style="margin:0 0 24px; font-size:15px; color:#999999; line-height:1.6;">
        Your registration for <strong style="color:#f43f5e;">${data.tournamentName || "the tournament"}</strong> has been confirmed.
      </p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:24px;">
        ${data.gamertag ? infoRow("Gamertag", String(data.gamertag)) : ""}
        ${data.teamName ? infoRow("Team", String(data.teamName)) : ""}
        ${data.registrationType ? infoRow("Type", String(data.registrationType).toUpperCase()) : ""}
      </table>
      <p style="margin:0 0 8px; font-size:13px; color:#666666;">
        Keep an eye on your notifications for check-in reminders and match updates.
      </p>
      ${button("View Tournament", data.tournamentUrl ? String(data.tournamentUrl) : `${FRONTEND_URL}`)}
    `, `You're registered for ${data.tournamentName || "a tournament"} on Esportra`)
  }),

  // ── Tournament Check-in Reminder ──
  CHECKIN_REMINDER: (data) => ({
    subject: `Check-in NOW: ${data.tournamentName || "Tournament"} | Esportra`,
    html: baseLayout(`
      <h2 style="margin:0 0 8px; font-size:22px; color:#ffffff; font-weight:700;">\u23F0 Check-in is Open!</h2>
      <p style="margin:0 0 24px; font-size:15px; color:#999999; line-height:1.6;">
        Check-in for <strong style="color:#f43f5e;">${data.tournamentName || "your tournament"}</strong> is now open.
        ${data.deadline ? `You have until <strong style="color:#ffffff;">${data.deadline}</strong> to confirm.` : ""}
      </p>
      <div style="background-color:#1a0a0e; border: 1px solid #e11d48; border-radius:8px; padding:16px; margin-bottom:24px; text-align:center;">
        <p style="margin:0; font-size:13px; color:#f43f5e; font-weight:600; text-transform:uppercase; letter-spacing:1px;">\u26A0\uFE0F Failure to check in = Automatic Removal</p>
      </div>
      ${button("Check In Now", data.tournamentUrl ? String(data.tournamentUrl) : `${FRONTEND_URL}`)}
    `, `Check-in is open for ${data.tournamentName || "your tournament"}`)
  }),

  // ── Welcome Email ──
  WELCOME: (data) => ({
    subject: `Welcome to Esportra \uD83D\uDC4B`,
    html: baseLayout(`
      <h2 style="margin:0 0 8px; font-size:22px; color:#ffffff; font-weight:700;">Welcome, ${data.username || "Player"}! \uD83C\uDF89</h2>
      <p style="margin:0 0 24px; font-size:15px; color:#999999; line-height:1.6;">
        You are now part of the Esportra competitive gaming ecosystem. Compete in tournaments, build your team, and climb the ranks.
      </p>
      ${button("Browse Tournaments", `${FRONTEND_URL}/tournaments`)}
    `, `Welcome to Esportra, ${data.username || "Player"}!`)
  }),

  // ── Team Invite ──
  TEAM_INVITE: (data) => {
    // Use Team Logo if available. If not, show nothing (no fallback).
    const logoUrl = data.teamLogo ? String(data.teamLogo) : null;

    return {
      subject: `You've been invited to join ${data.teamName || "a team"} | Esportra`,
      html: baseLayout(`
      <div style="text-align: center; margin-bottom: 30px;">
        ${logoUrl ? `<img src="${logoUrl}" alt="Team Logo" width="100" style="width:100px; height:auto; margin-bottom: 16px; display:inline-block;">` : ''}
        <h2 style="margin:0 0 8px; font-size:24px; color:#ffffff; font-weight:800; letter-spacing: -0.5px;">Team Invitation</h2>
        <p style="margin:0; font-size:16px; color:#a3a3a3;">You've been scouted.</p>
      </div>
      
      <div style="background-color: #1a1a1a; border: 1px solid #333; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
          ${infoRow("Team Name", String(data.teamName || "Esportra Team"))}
          ${infoRow("Role", "Player")}
        </table>
      </div>
 
      <p style="margin:0 0 24px; font-size:14px; color:#888888; line-height:1.6; text-align: center;">
        Accepting this invitation will add you to the roster immediately. You can view full team details before deciding.
      </p>
 
      ${button("Review Invitation", `${FRONTEND_URL}/player/teams`)}
    `, `${data.invitedBy || "Someone"} invited you to join ${data.teamName || "a team"}`)
    }
  },

  // ── Partner Portal Welcome (Existing User) ──
  PARTNER_WELCOME: (data) => ({
    subject: `Access Granted: ${data.sponsorName || "Sponsor"} Portal | Esportra`,
    html: baseLayout(`
      <h2 style="margin:0 0 8px; font-size:22px; color:#ffffff; font-weight:700;">Partner Portal Access \uD83E\uDD1D</h2>
      <p style="margin:0 0 24px; font-size:15px; color:#999999; line-height:1.6;">
        You have been added as an authorized partner for <strong style="color:#f43f5e;">${data.sponsorName || "your organization"}</strong>.
      </p>
      <div style="background-color:#111111; border: 1px solid #333; border-radius: 8px; padding: 20px; margin-bottom: 24px; text-align: center;">
        <p style="margin:0; font-size:14px; color:#ffffff;">
          Since you already have an Esportra account, you can log in directly using your existing email and password.
        </p>
      </div>
      ${button("Go to Partner Portal", `${PARTNER_URL}/login`)}
    `, `Access granted to the ${data.sponsorName || "Sponsor"} Portal on Esportra`)
  }),

  // ── Partner Portal Invite (New User) ──
  PARTNER_INVITE: (data) => ({
    subject: `Invite: ${data.sponsorName || "Sponsor"} Partner Portal | Esportra`,
    html: baseLayout(`
      <h2 style="margin:0 0 8px; font-size:22px; color:#ffffff; font-weight:700;">Complete Your Setup \u2728</h2>
      <p style="margin:0 0 24px; font-size:15px; color:#999999; line-height:1.6;">
        You've been invited to manage <strong style="color:#f43f5e;">${data.sponsorName || "your organization"}</strong> on the Esportra Partner Portal.
      </p>
      <p style="margin:0 0 24px; font-size:14px; color:#888888; line-height:1.6; text-align: center;">
        Use the secure link below to set your password and activate your partner account.
      </p>
      ${button("Set Up Account", data.setupUrl ? String(data.setupUrl) : `${PARTNER_URL}/login`)}
      <p style="margin:24px 0 0; font-size:11px; color:#555555; text-align: center;">
        For security, this link will expire in 24 hours.
      </p>
    `, `You've been invited to the ${data.sponsorName || "Sponsor"} Partner Portal`)
  }),
};

interface EmailTemplate {
  subject: string;
  html: string;
}

// ── Public API ──
export function getTemplate(type: string, data: Record<string, unknown>): EmailTemplate | null {
  const templateFn = templates[type];
  if (!templateFn) return null;
  return templateFn(data);
}
