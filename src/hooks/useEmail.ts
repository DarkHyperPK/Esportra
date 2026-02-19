import { supabase } from '@/lib/supabase';

/**
 * Email types supported by the send-email Edge Function.
 * Each type maps to a custom HTML template on the server.
 */
export type EmailType =
    | 'TOURNAMENT_REGISTRATION'
    | 'CHECKIN_REMINDER'
    | 'MATCH_CHECKIN_REMINDER'
    | 'WELCOME'
    | 'TEAM_INVITE';

interface SendEmailParams {
    type: EmailType;
    email: string;
    data: Record<string, unknown>;
}

/**
 * Sends a transactional email via the `send-email` Supabase Edge Function.
 * The API key is stored securely server-side; nothing is exposed to the client.
 *
 * @example
 * await sendEmail({
 *   type: 'TOURNAMENT_REGISTRATION',
 *   email: user.email,
 *   data: { tournamentName: 'Valorant Cup', gamertag: 'Player1' }
 * });
 */
export async function sendEmail({ type, email, data }: SendEmailParams): Promise<{ success: boolean; error?: string }> {
    try {
        const { data: result, error } = await supabase.functions.invoke('send-email', {
            body: { type, email, data },
        });

        if (error) {
            console.error('[sendEmail] Edge function error:', error);
            return { success: false, error: error.message };
        }

        if (result?.error) {
            console.error('[sendEmail] Server error:', result.error);
            return { success: false, error: result.error };
        }

        console.log('[sendEmail] Email sent:', type, '->', email);
        return { success: true };
    } catch (err: unknown) {
        const e = err as { message?: string };
        console.error('[sendEmail] Unexpected error:', e);
        return { success: false, error: e.message || 'Unknown error sending email' };
    }
}
