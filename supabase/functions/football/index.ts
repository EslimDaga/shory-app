import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

// Proxy for football-data.org. The API key lives only here (`supabase secrets set
// FOOTBALL_DATA_KEY=…`), never in the app. The free plan allows 10 calls per minute for the whole
// app, so team lists and results are cached in Postgres (see supabase/migrations) and shared.

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const FOOTBALL_DATA_KEY = Deno.env.get('FOOTBALL_DATA_KEY');

const API = 'https://api.football-data.org/v4';
// The free plan's competitions (football-data.org "TIER_ONE").
const COMPETITIONS = ['PL', 'PD', 'SA', 'BL1', 'FL1', 'CL', 'DED', 'PPL', 'ELC', 'BSA', 'WC', 'EC'];
const TEAMS_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
// A competition whose team sync failed is retried after this long, not on the next search.
const TEAMS_RETRY_MS = 60 * 60 * 1000;
const SYNC_MAX_AGE_MS = 60 * 1000;
// A match played in the last few days still syncs, for a story posted after the game.
const SYNC_WINDOW_DAYS = 7;
const SEARCH_LIMIT = 8;

// football-data.org v4 match statuses.
const LIVE_STATUSES = ['IN_PLAY', 'PAUSED', 'EXTRA_TIME', 'PENALTY_SHOOTOUT'];
const FINAL_STATUSES = ['FINISHED', 'AWARDED'];
// Called off: no score to show, and not the next match either.
const CALLED_OFF_STATUSES = ['POSTPONED', 'CANCELLED', 'SUSPENDED'];

type Team = { id: number; name: string; shortName: string | null; tla: string | null; crest: string | null };

type ApiTeam = { id: number; name: string; shortName?: string; tla?: string; crest?: string };

type ApiMatch = {
  utcDate: string;
  status: string;
  matchday: number | null;
  competition: { name: string };
  homeTeam: ApiTeam;
  awayTeam: ApiTeam;
  score: {
    fullTime: { home: number | null; away: number | null };
    penalties?: { home: number | null; away: number | null } | null;
  };
};

class UpstreamError extends Error {}

const isTeamId = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value > 0;

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

async function footballData<T>(path: string): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    headers: { 'X-Auth-Token': FOOTBALL_DATA_KEY! },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new UpstreamError(`football-data ${response.status}`);
  return (await response.json()) as T;
}

// Lowercase, accents stripped: what `football_teams.search` holds and what a query is matched as.
const normalize = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const toTeam = (team: ApiTeam): Team => ({
  id: team.id,
  name: team.name,
  shortName: team.shortName ?? null,
  tla: team.tla ?? null,
  crest: team.crest ?? null,
});

// Keeps the team index fresh a little at a time: at most one competition per request, the one
// synced longest ago, so a search never spends more than one upstream call on it.
async function refreshOneCompetition(db: SupabaseClient): Promise<void> {
  const { data: synced } = await db.from('football_sync').select('competition, synced_at');
  const syncedAt = new Map((synced ?? []).map((row) => [row.competition, Date.parse(row.synced_at)]));
  const stale = COMPETITIONS.filter((code) => Date.now() - (syncedAt.get(code) ?? 0) > TEAMS_MAX_AGE_MS).sort(
    (a, b) => (syncedAt.get(a) ?? 0) - (syncedAt.get(b) ?? 0),
  );
  const code = stale[0];
  if (!code) return;

  // Claimed first, so concurrent requests don't all spend a call on the same competition.
  await db.from('football_sync').upsert({ competition: code, synced_at: new Date().toISOString() });
  try {
    const { teams } = await footballData<{ teams: ApiTeam[] }>(`/competitions/${code}/teams`);
    const rows = teams.map((team) => ({
      id: team.id,
      name: team.name,
      short_name: team.shortName ?? null,
      tla: team.tla ?? null,
      crest: team.crest ?? null,
      search: normalize([team.name, team.shortName, team.tla].filter(Boolean).join(' ')),
      competition: code,
      updated_at: new Date().toISOString(),
    }));
    if (rows.length > 0) {
      const { error } = await db.from('football_teams').upsert(rows);
      if (error) throw error;
    }
  } catch (error) {
    // Stale again in TEAMS_RETRY_MS, and newer than the other stale competitions, so one that keeps
    // failing neither costs every search an upstream call nor blocks the others from refreshing.
    await db.from('football_sync').upsert({
      competition: code,
      synced_at: new Date(Date.now() - TEAMS_MAX_AGE_MS + TEAMS_RETRY_MS).toISOString(),
    });
    console.error('football: team sync failed', code, error);
  }
}

async function searchTeams(db: SupabaseClient, query: string): Promise<Team[]> {
  await refreshOneCompetition(db);
  // Escaped for ILIKE.
  const term = normalize(query)
    .replace(/[%_\\]/g, ' ')
    .trim();
  if (term.length < 2) return [];
  const { data } = await db
    .from('football_teams')
    .select('id, name, short_name, tla, crest')
    .ilike('search', `%${term}%`)
    .order('name')
    .limit(SEARCH_LIMIT);
  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    shortName: row.short_name,
    tla: row.tla,
    crest: row.crest,
  }));
}

// Rows hold `{ value }`, so a null answer ("no match") is cached too: `body` can't be SQL null.
async function cached<T>(
  db: SupabaseClient,
  key: string,
  maxAgeMs: number,
  load: () => Promise<T>,
): Promise<T> {
  const { data } = await db.from('football_cache').select('body, fetched_at').eq('key', key).maybeSingle();
  if (data && Date.now() - Date.parse(data.fetched_at) < maxAgeMs) return data.body.value as T;
  try {
    const value = await load();
    const { error } = await db
      .from('football_cache')
      .upsert({ key, body: { value }, fetched_at: new Date().toISOString() });
    if (error) console.error('football: cache write failed', key, error);
    return value;
  } catch (error) {
    // Upstream busy or down: a stale answer beats none.
    if (data) return data.body.value as T;
    throw error;
  }
}

// The match between two teams around today: live if it's being played, else the one whose kickoff
// is closest to now (on second-leg day, today's match rather than last week's first leg). Cached
// for a minute, so a whole stadium syncing costs one call.
async function syncMatch(db: SupabaseClient, homeId: number, awayId: number) {
  const pair = [homeId, awayId].sort((a, b) => a - b).join(':');
  // `sync2:` rows are wrapped in `{ value }`; older bare `sync:` rows are never read.
  return cached(db, `sync2:${pair}`, SYNC_MAX_AGE_MS, async () => {
    const day = (offsetDays: number) =>
      new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const { matches } = await footballData<{ matches: ApiMatch[] }>(
      `/teams/${homeId}/matches?dateFrom=${day(-SYNC_WINDOW_DAYS)}&dateTo=${day(1)}`,
    );
    const isLive = (candidate: ApiMatch) => LIVE_STATUSES.includes(candidate.status);
    const now = Date.now();
    const match = matches
      .filter(
        (candidate) =>
          !CALLED_OFF_STATUSES.includes(candidate.status) &&
          ((candidate.homeTeam.id === homeId && candidate.awayTeam.id === awayId) ||
            (candidate.homeTeam.id === awayId && candidate.awayTeam.id === homeId)),
      )
      .sort(
        (a, b) =>
          Number(isLive(b)) - Number(isLive(a)) ||
          Math.abs(Date.parse(a.utcDate) - now) - Math.abs(Date.parse(b.utcDate) - now),
      )[0];
    if (!match) return null;
    // `fullTime` counts shootout goals too (1-1, then 4-3 on penalties, is 5-4), so they're taken out.
    const penalties = match.score.penalties;
    const withoutShootout = (total: number | null, shootout: number | null | undefined) =>
      total === null ? null : total - (shootout ?? 0);
    return {
      status: isLive(match) ? 'live' : FINAL_STATUSES.includes(match.status) ? 'finished' : 'scheduled',
      competition: match.competition.name,
      matchday: match.matchday,
      date: match.utcDate,
      home: toTeam(match.homeTeam),
      away: toTeam(match.awayTeam),
      homeScore: withoutShootout(match.score.fullTime.home, penalties?.home),
      awayScore: withoutShootout(match.score.fullTime.away, penalties?.away),
    };
  });
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return json(405, { error: 'method_not_allowed' });
  if (!FOOTBALL_DATA_KEY) {
    console.error('football: FOOTBALL_DATA_KEY is not set');
    return json(500, { error: 'not_configured' });
  }

  // Signed-in users only: the upstream quota is shared, so it isn't open to anyone with the anon key.
  const authorization = request.headers.get('Authorization');
  if (!authorization) return json(401, { error: 'missing_authorization' });
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });
  const { data: auth, error: authError } = await userClient.auth.getUser();
  if (authError || !auth.user) return json(401, { error: 'invalid_session' });

  const body = (await request.json().catch(() => ({}))) as {
    action?: unknown;
    query?: unknown;
    homeId?: unknown;
    awayId?: unknown;
  };
  const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  // Live football data is a Shory Pro feature, enforced here and not only in the app.
  const { data: pro } = await db.rpc('is_pro', { uid: auth.user.id });
  if (pro !== true) return json(402, { error: 'pro_required' });

  try {
    if (body.action === 'search' && typeof body.query === 'string') {
      return json(200, { teams: await searchTeams(db, body.query.slice(0, 40)) });
    }
    if (
      body.action === 'sync' &&
      isTeamId(body.homeId) &&
      isTeamId(body.awayId) &&
      body.homeId !== body.awayId
    ) {
      return json(200, { match: await syncMatch(db, body.homeId, body.awayId) });
    }
    return json(400, { error: 'bad_request' });
  } catch (error) {
    console.error('football: request failed', error);
    return json(error instanceof UpstreamError ? 503 : 500, { error: 'unavailable' });
  }
});
