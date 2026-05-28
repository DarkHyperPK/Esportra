import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Load `e2e/.env` when present (keys already in process.env are not overwritten). */
export function loadE2eEnv(): void {
  const envPath = path.resolve(__dirname, '../.env');
  if (!fs.existsSync(envPath)) return;

  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

export type E2ePlayer = {
  email: string;
  password: string;
};

export type E2eEnv = {
  apiUrl: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  organizerEmail: string;
  organizerPassword: string;
  players: E2ePlayer[];
  baseUrl: string;
  /** Game room path segment — `br-lobby` on staging until canonical route is deployed. */
  brGameRoomPath: string;
};

function isPlaceholder(value: string | undefined): boolean {
  if (!value) return true;
  return /^(REPLACE_|your-|CHANGEME)/i.test(value.trim());
}

function readPlayer(index: 1 | 2 | 3): E2ePlayer | null {
  const email = process.env[`E2E_PLAYER${index}_EMAIL`];
  if (!email) return null;

  const password =
    process.env[`E2E_PLAYER${index}_PASSWORD`] ?? process.env.E2E_PLAYER_PASSWORD;
  if (isPlaceholder(password)) return null;

  return { email, password: password! };
}

export function readE2eEnv(): E2eEnv | null {
  loadE2eEnv();

  const apiUrl = process.env.E2E_API_URL || process.env.VITE_API_URL;
  const supabaseUrl = process.env.E2E_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey =
    process.env.E2E_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const organizerEmail = process.env.E2E_ORGANIZER_EMAIL;
  const organizerPassword = process.env.E2E_ORGANIZER_PASSWORD;
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  const brGameRoomPath = (process.env.E2E_BR_GAME_ROOM_PATH || 'br-game-room').replace(/^\//, '');

  const players = ([1, 2, 3] as const)
    .map((index) => readPlayer(index))
    .filter((player): player is E2ePlayer => player !== null);

  if (
    !apiUrl ||
    !supabaseUrl ||
    !supabaseAnonKey ||
    !organizerEmail ||
    isPlaceholder(organizerPassword) ||
    players.length < 2
  ) {
    return null;
  }

  return {
    apiUrl: apiUrl.replace(/\/$/, ''),
    supabaseUrl: supabaseUrl.replace(/\/$/, ''),
    supabaseAnonKey,
    organizerEmail,
    organizerPassword,
    players,
    baseUrl,
    brGameRoomPath,
  };
}

export function e2eSkipReason(env: E2eEnv | null): string | null {
  if (env) return null;
  return [
    'Set e2e credentials in e2e/.env (see e2e/.env.example):',
    'BASE_URL, E2E_API_URL, E2E_SUPABASE_URL, E2E_SUPABASE_ANON_KEY,',
    'E2E_ORGANIZER_EMAIL, E2E_ORGANIZER_PASSWORD,',
    'E2E_PLAYER1_EMAIL, E2E_PLAYER1_PASSWORD, E2E_PLAYER2_EMAIL, E2E_PLAYER2_PASSWORD',
  ].join(' ');
}
