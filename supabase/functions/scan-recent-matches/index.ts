import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * Resolves the correct VAL API region for a given PUUID.
 * Uses stored region from riot_accounts, with fallback to shard detection.
 */
async function resolveValRegion(
    puuid: string,
    storedRegion: string | null,
    apiKey: string,
    supabaseClient?: any,
    userId?: string
): Promise<string> {
    // If we have a valid VAL region stored, use it directly
    const validRegions = ['ap', 'na', 'eu', 'kr', 'br', 'latam'];
    if (storedRegion && validRegions.includes(storedRegion.toLowerCase())) {
        return storedRegion.toLowerCase();
    }

    // Fallback: detect shard via Riot API
    console.log(`[Scan Matches] No valid region stored, detecting shard for ${puuid}...`);
    try {
        const resp = await fetch(
            `https://americas.api.riotgames.com/riot/account/v1/active-shards/by-game/val/by-puuid/${puuid}`,
            { headers: { 'X-Riot-Token': apiKey } }
        );
        if (resp.ok) {
            const data = await resp.json();
            const detected = data.activeShard?.toLowerCase() || 'na';
            console.log(`[Scan Matches] Detected shard: ${detected}`);

            // Persist for future calls (fire-and-forget)
            if (supabaseClient && userId) {
                supabaseClient
                    .from('riot_accounts')
                    .update({ region: detected })
                    .eq('user_id', userId)
                    .then(() => console.log(`[Scan Matches] Persisted region=${detected}`))
                    .catch((e: any) => console.warn('[Scan Matches] Failed to persist region:', e));
            }

            return detected;
        }
    } catch (err) {
        console.warn('[Scan Matches] Shard detection failed:', err);
    }

    return 'na'; // ultimate fallback
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        )

        const { matchId, gameNumber, mapName, scheduledTime } = await req.json()

        console.log(`[Scan Matches] Request: matchId=${matchId}, game=${gameNumber}, map=${mapName}, time=${scheduledTime}`)

        // 1. Get User's Connected Riot Account
        const { data: { user } } = await supabaseClient.auth.getUser()
        if (!user) throw new Error('Unauthorized')

        const { data: riotAccount } = await supabaseClient
            .from('riot_accounts')
            .select('puuid, region')
            .eq('user_id', user.id)
            .single()

        if (!riotAccount) {
            return new Response(JSON.stringify({ error: 'Riot account not linked', matches: [] }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        // 2. Resolve correct VAL API region
        const RIOT_API_KEY = Deno.env.get('RIOT_API_KEY')
        if (!RIOT_API_KEY) throw new Error('Riot API Key not configured')

        const valRegion = await resolveValRegion(
            riotAccount.puuid,
            riotAccount.region,
            RIOT_API_KEY,
            supabaseClient,
            user.id
        )

        // 3. Fetch Matchlist — using correct VAL region (ap/na/eu)
        const matchListUrl = `https://${valRegion}.api.riotgames.com/val/match/v1/matchlists/by-puuid/${riotAccount.puuid}`
        console.log(`[Scan Matches] Fetching matchlist from: ${matchListUrl}`)

        const listResp = await fetch(matchListUrl, {
            headers: { 'X-Riot-Token': RIOT_API_KEY }
        })

        if (!listResp.ok) {
            const errText = await listResp.text()
            console.error(`[Scan Matches] Riot List Error: ${listResp.status} ${errText}`)
            throw new Error(`Failed to fetch match history from Riot (${listResp.status})`)
        }

        const { history } = await listResp.json()
        if (!history || history.length === 0) {
            return new Response(JSON.stringify({ matches: [] }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        // 4. Process Candidates — fetch details for recent matches
        const candidates = []
        // ALL FILTERS REMOVED except mandatory map name as requested
        // Extended depth to 40 matches to be super safe
        const recentHistory = history.slice(0, 40)

        // Map mapping for internal Valorant IDs
        const MAP_MAPPING: Record<string, string> = {
            'bind': 'duality',
            'haven': 'triad',
            'split': 'bonsai',
            'ascent': 'ascent',
            'icebox': 'port',
            'breeze': 'foxtrot',
            'fracture': 'canyon',
            'pearl': 'pitt',
            'lotus': 'jam',
            'sunset': 'juliett',
            'juliett': 'juliett',
            'abyss': 'infinity',
            'infinity': 'infinity',
            'corrode': 'rook',
            'rook': 'rook'
        };

        for (const matchEntry of recentHistory) {
            const riotMatchId = matchEntry.matchId

            // Fetch Detailed Match Info
            const detailUrl = `https://${valRegion}.api.riotgames.com/val/match/v1/matches/${riotMatchId}`
            const detailResp = await fetch(detailUrl, {
                headers: { 'X-Riot-Token': RIOT_API_KEY }
            })

            if (!detailResp.ok) {
                console.warn(`[Scan Matches] Failed to fetch details for ${riotMatchId}: ${detailResp.status}`)
                continue
            }

            const matchData = await detailResp.json()
            const info = matchData.matchInfo
            const players = matchData.players
            const teams = matchData.teams

            // MANDATORY FILTER: Map Check
            const rawMapId = info.mapId.split('/').pop()?.toLowerCase() || ''
            const targetMapDisplay = (mapName || '').toLowerCase()
            const internalMapId = MAP_MAPPING[targetMapDisplay] || targetMapDisplay

            if (targetMapDisplay && !rawMapId.includes(internalMapId) && !internalMapId.includes(rawMapId)) {
                console.log(`[Scan Matches] Skipping ${riotMatchId}, map mismatch: ${rawMapId} vs ${internalMapId} (for ${targetMapDisplay})`)
                continue
            }

            console.log(`[Scan Matches] Candidate ${riotMatchId} matched map ${targetMapDisplay}`)

            // Find the requesting player in this match
            const me = players.find((p: any) => p.puuid === riotAccount.puuid)
            const myTeamId = me?.teamId // 'Blue' or 'Red'

            const myTeam = teams.find((t: any) => t.teamId === myTeamId)
            const enemyTeam = teams.find((t: any) => t.teamId !== myTeamId)
            const isWinner = myTeam?.won || false

            // Build rich candidate object
            candidates.push({
                id: riotMatchId,
                map: targetMapDisplay,
                mapId: info.mapId,
                queueId: info.queueId || '',
                startTime: info.gameStartMillis,
                gameLengthMillis: info.gameLengthMillis,
                // Scores from the requesting player's perspective
                myTeamScore: myTeam?.roundsWon || 0,
                enemyTeamScore: enemyTeam?.roundsWon || 0,
                reporterSide: myTeamId, // 'Blue' or 'Red'
                score: `${myTeam?.roundsWon || 0} - ${enemyTeam?.roundsWon || 0}`,
                result: isWinner ? 'Victory' : 'Defeat',
                kda: `${me?.stats?.kills || 0}/${me?.stats?.deaths || 0}/${me?.stats?.assists || 0}`,
                agent: me?.characterId,
                // Team details for verification
                blueTeam: {
                    roundsWon: teams.find((t: any) => t.teamId === 'Blue')?.roundsWon || 0,
                    won: teams.find((t: any) => t.teamId === 'Blue')?.won || false,
                },
                redTeam: {
                    roundsWon: teams.find((t: any) => t.teamId === 'Red')?.roundsWon || 0,
                    won: teams.find((t: any) => t.teamId === 'Red')?.won || false,
                },
                // Player list snapshot for match_data
                players: players.map((p: any) => ({
                    puuid: p.puuid,
                    gameName: p.gameName,
                    tagLine: p.tagLine,
                    teamId: p.teamId,
                    characterId: p.characterId,
                    kills: p.stats?.kills || 0,
                    deaths: p.stats?.deaths || 0,
                    assists: p.stats?.assists || 0,
                    score: p.stats?.score || 0,
                })),
            })
        }

        console.log(`[Scan Matches] Found ${candidates.length} matching candidates`)

        return new Response(JSON.stringify({ matches: candidates }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

    } catch (error) {
        console.error(error)
        return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }
})
