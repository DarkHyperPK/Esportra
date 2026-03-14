import { apiClient, ApiError } from '@/lib/apiClient';

/**
 * Email types supported by the .NET email endpoint.
 * Each type maps to a custom HTML template on the server.
 */
export type EmailType =
    | 'TournamentRegistration'
    | 'CheckinReminder'
    | 'MatchCheckinReminder'
    | 'Welcome'
    | 'TeamInvite'
    | 'StaffInvite';

interface SendEmailParams {
    type: EmailType;
    email: string;
    data: Record<string, unknown>;
}

/**
 * Sends a transactional email via POST /api/emails (.NET backend).
 *
 * @example
 * await sendEmail({
 *   type: 'TournamentRegistration',
 *   email: user.email,
 *   data: { tournamentName: 'Valorant Cup', gamertag: 'Player1' }
 * });
 */
export async function sendEmail({ type, email, data }: SendEmailParams): Promise<{ success: boolean; error?: string }> {
    try {
        const result = await apiClient.post<{ success: boolean; error?: string }>('/api/emails', {
            type,
            email,
            data,
        });

        if (result?.error) {
            console.error('[sendEmail] Server error:', result.error);
            return { success: false, error: result.error };
        }

        return { success: true };
    } catch (err: unknown) {
        const message = err instanceof ApiError
            ? `API ${err.status}: ${err.message}`
            : err instanceof Error ? err.message : 'Unknown error sending email';
        console.error('[sendEmail] Error:', err);
        return { success: false, error: message };
    }
}
