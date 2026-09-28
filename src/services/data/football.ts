import { strings } from '@/i18n/es';
import { getSupabase } from '@/services/auth/supabase';

// football-data.org, through the `football` Edge Function: the API key stays on the server and
// results are cached there for every user (see supabase/functions/football).

export type FootballTeam = {
  id: number;
  name: string;
  shortName: string | null;
  tla: string | null;
  crest: string | null;
};

export type FootballMatch = {
  status: 'live' | 'finished' | 'scheduled';
  competition: string;
  matchday: number | null;
  date: string;
  home: FootballTeam;
  away: FootballTeam;
  homeScore: number | null;
  awayScore: number | null;
};

async function call<T>(body: Record<string, unknown>): Promise<T> {
  let supabase;
  try {
    supabase = getSupabase();
  } catch {
    throw new Error(strings.widgets.live.failed);
  }
  const { data, error } = await supabase.functions.invoke<T>('football', { body });
  // 402: the server only serves live football to Shory Pro accounts.
  const status = (error as { context?: { status?: number } } | null)?.context?.status;
  if (status === 402) throw new Error(strings.widgets.live.proRequired);
  if (error || !data) throw new Error(strings.widgets.live.failed);
  return data;
}

export async function searchTeams(query: string): Promise<FootballTeam[]> {
  if (query.trim().length < 2) return [];
  const { teams } = await call<{ teams: FootballTeam[] }>({ action: 'search', query: query.trim() });
  return teams;
}

// The match between the two teams around today (live, just finished, or next), or null.
export async function syncMatch(homeId: number, awayId: number): Promise<FootballMatch | null> {
  const { match } = await call<{ match: FootballMatch | null }>({ action: 'sync', homeId, awayId });
  return match;
}

export const teamLabel = (team: FootballTeam) => team.shortName ?? team.name;
