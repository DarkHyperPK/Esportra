import { signInWithPassword } from './auth';
import { ApiClient } from './api';
import type { E2eEnv } from './env';

export async function createOrganizerClient(env: E2eEnv): Promise<ApiClient> {
  const session = await signInWithPassword(
    env.supabaseUrl,
    env.supabaseAnonKey,
    env.organizerEmail,
    env.organizerPassword,
  );
  return new ApiClient(env.apiUrl, session.access_token);
}

export async function createPlayerClients(env: E2eEnv, count = 2): Promise<ApiClient[]> {
  const sessions = await Promise.all(
    env.players.slice(0, count).map((player) =>
      signInWithPassword(
        env.supabaseUrl,
        env.supabaseAnonKey,
        player.email,
        player.password,
      ),
    ),
  );
  return sessions.map((session) => new ApiClient(env.apiUrl, session.access_token));
}
