import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * Resolves the correct VAL API region for a given PUUID.
 */
async function resolveValRegion(
    puuid: string,
    storedRegion: string | null,
    apiKey: string
): Promise<string> {
    const validRegions = ['ap', 'na', 'eu', 'kr', 'br', 'latam'];
    if (storedRegion && validRegions.includes(storedRegion.toLowerCase())) {
        return storedRegion.toLowerCase();
    }

    // Fallback: detect shard
    try {
        const resp = await fetch(
            `https://americas.api.riotgames.com/riot/account/v1/active-shards/by-game/val/by-puuid/${puuid}`,
            { headers: { 'X-Riot-Token': apiKey } }
        );
        if (resp.ok) {
            const data = await resp.json();
            return data.activeShard?.toLowerCase() || 'na';
        }
    } catch (err) {
        console.warn('[Process Result] Shard detection failed:', err);
    }
    return 'na';
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // Service role client for database writes (Bypasses RLS)
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // Auth client to verify the user
        const authClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        )
        const { data: { user } } = await authClient.auth.getUser()
        if (!user) throw new Error('Unauthorized')

        const { matchId, gameNumber, riotMatchId, mapId } = await req.json()

        console.log(`[Process Result] Match=${matchId}, Game=${gameNumber}, RiotID=${riotMatchId}`)

        // 1. Fetch Riot Match Details with correct region
        const RIOT_API_KEY = Deno.env.get('RIOT_API_KEY')
        if (!RIOT_API_KEY) throw new Error('Riot API Key not configured')

        // First, find the reporter we are verifying against
        console.log(`[Process Result] Looking for report: Match=${matchId}, Game=${gameNumber}`)
        const { data: report, error: reportError } = await supabaseClient
            .from('match_result_reports')
            .select('id, reported_by')
            .eq('match_id', matchId)
            .eq('game_number', gameNumber)
            .in('status', ['pending', 'accepted'])
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

        if (reportError) {
            console.error('[Process Result] Report lookup error:', reportError)
            throw new Error(`Report lookup failed: ${reportError.message}`)
        }
        if (!report) {
            throw new Error(`No pending or accepted report found for match ${matchId} game ${gameNumber}`)
        }

        console.log(`[Process Result] Found report ${report.id} by user ${report.reported_by}`)

        const { data: riotAccount, error: riotError } = await supabaseClient
            .from('riot_accounts')
            .select('puuid, region')
            .eq('user_id', report.reported_by)
            .maybeSingle()

        if (riotError) {
            console.error('[Process Result] Riot account lookup error:', riotError)
            throw new Error(`Riot account lookup failed: ${riotError.message}`)
        }
        if (!riotAccount) {
            throw new Error(`Reporter ${report.reported_by} does not have a linked Riot account anymore.`)
        }

        console.log(`[Process Result] Resolved Reporter: PUUID=${riotAccount.puuid}, Region=${riotAccount.region}`)

        const valRegion = await resolveValRegion(
            riotAccount.puuid,
            riotAccount.region,
            RIOT_API_KEY
        )

        const detailUrl = `https://${valRegion}.api.riotgames.com/val/match/v1/matches/${riotMatchId}`
        console.log(`[Process Result] Fetching match details from: ${detailUrl}`)
        const detailResp = await fetch(detailUrl, { headers: { 'X-Riot-Token': RIOT_API_KEY } })

        if (!detailResp.ok) throw new Error(`Failed to fetch Riot match details (${detailResp.status})`)
        const matchData = await detailResp.json()

        // 2. Fetch Tournament Match Data (Teams)
        const { data: brktMatch, error: matchError } = await supabaseClient
            .from('brkt_matches')
            .select('team1_id, team2_id, best_of, version')
            .eq('id', matchId)
            .single()

        if (matchError || !brktMatch) throw new Error('Tournament match not found')

        // 3. Verify Player Participation
        const getRoster = async (teamId: string) => {
            console.log(`[Verify] Fetching roster for team: ${teamId}`)
            const { data } = await supabaseClient.from('team_members').select('user_id').eq('team_id', teamId)
            if (!data) return []
            const userIds = data.map(m => m.user_id)
            if (userIds.length === 0) return []
            const { data: accounts } = await supabaseClient.from('riot_accounts').select('puuid').in('user_id', userIds)
            const puuids = accounts?.map(a => a.puuid).filter(Boolean) || []
            console.log(`[Verify] Found ${puuids.length} PUUIDs for team ${teamId}`)
            return puuids
        }

        const t1Puuids = await getRoster(brktMatch.team1_id)
        const t2Puuids = await getRoster(brktMatch.team2_id)

        const bluePlayers = (matchData.players || []).filter((p: any) => p.teamId === 'Blue' || p.teamId === 1200 || p.teamId === '1200').map((p: any) => p.puuid)
        const redPlayers = (matchData.players || []).filter((p: any) => p.teamId === 'Red' || p.teamId === 1100 || p.teamId === '1100').map((p: any) => p.puuid)

        console.log(`[Process Result] Riot Match Players: Blue=${bluePlayers.length}, Red=${redPlayers.length}. Total=${matchData.players?.length}`)


        // Count overlaps
        const t1InBlue = bluePlayers.filter((p: string) => t1Puuids.includes(p)).length
        const t1InRed = redPlayers.filter((p: string) => t1Puuids.includes(p)).length
        const t2InBlue = bluePlayers.filter((p: string) => t2Puuids.includes(p)).length
        const t2InRed = redPlayers.filter((p: string) => t2Puuids.includes(p)).length

        console.log(`[Verify] T1 overlaps: Blue=${t1InBlue}, Red=${t1InRed}`)
        console.log(`[Verify] T2 overlaps: Blue=${t2InBlue}, Red=${t2InRed}`)

        // Determine Sides
        let t1Side = ''
        let t2Side = ''

        // Strategy: First assign sides with clear participation
        if (t1InBlue > 0 && t1InRed === 0) t1Side = 'Blue'
        else if (t1InRed > 0 && t1InBlue === 0) t1Side = 'Red'
        else if (t1InBlue > t1InRed) t1Side = 'Blue'
        else if (t1InRed > t1InBlue) t1Side = 'Red'

        if (t2InBlue > 0 && t2InRed === 0) t2Side = 'Blue'
        else if (t2InRed > 0 && t2InBlue === 0) t2Side = 'Red'
        else if (t2InBlue > t2InRed) t2Side = 'Blue'
        else if (t2InRed > t2InBlue) t2Side = 'Red'

        console.log(`[Verify] Initial Sides: T1=${t1Side}, T2=${t2Side}`)

        // If one is missing, infer it
        if (t1Side && !t2Side) t2Side = t1Side === 'Blue' ? 'Red' : 'Blue'
        if (!t1Side && t2Side) t1Side = t2Side === 'Blue' ? 'Red' : 'Blue'

        if (!t1Side && !t2Side) {
            console.error('[Verify] Critical: No players found on either side.')
            throw new Error('Could not verify team participation. Please ensure your match teammates have linked their Riot accounts on the profile page.')
        }

        if (t1Side === t2Side) {
            console.error(`[Verify] Conflict: Both teams detected on ${t1Side}`)
            throw new Error('Verification conflict: Players from both teams detected on the SAME side in-game.')
        }

        console.log(`[Verify] Final Sides: T1=${t1Side}, T2=${t2Side}`)

        // 4. Extract Result
        // Support both string "Blue"/"Red" and numeric 1200/1100 in teams array
        const teams = matchData.teams || []
        const t1Data = teams.find((t: any) =>
            (t1Side === 'Blue' && (t.teamId === 'Blue' || t.teamId === 1200 || t.teamId === '1200')) ||
            (t1Side === 'Red' && (t.teamId === 'Red' || t.teamId === 1100 || t.teamId === '1100'))
        )
        const t2Data = teams.find((t: any) =>
            (t2Side === 'Blue' && (t.teamId === 'Blue' || t.teamId === 1200 || t.teamId === '1200')) ||
            (t2Side === 'Red' && (t.teamId === 'Red' || t.teamId === 1100 || t.teamId === '1100'))
        )


        if (!t1Data || !t2Data) {
            console.error('[Verify] Failed to find team data in Riot match response', { t1Side, t2Side })
            throw new Error('Failed to extract team scores from match data.')
        }

        const t1Score = t1Data.roundsWon
        const t2Score = t2Data.roundsWon
        const isDraw = !t1Data.won && !t2Data.won

        const gameWinnerId = isDraw ? null : (t1Data.won ? brktMatch.team1_id : brktMatch.team2_id)
        const gameLoserId = isDraw ? null : (t1Data.won ? brktMatch.team2_id : brktMatch.team1_id)

        // 5. Build match snapshot for storage
        const matchSnapshot = {
            riotMatchId,
            mapId: matchData.matchInfo?.mapId,
            gameStartMillis: matchData.matchInfo?.gameStartMillis,
            gameLengthMillis: matchData.matchInfo?.gameLengthMillis,
            queueId: matchData.matchInfo?.queueId,
            t1Side,
            t2Side,
            verification: {
                t1InBlue, t1InRed, t2InBlue, t2InRed
            },
            players: matchData.players.map((p: any) => ({
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
        }

        // 6. Detect Match MVP (highest Combat Score)
        let mvpProfileId: string | null = null
        try {
            const allPlayers = matchData.players || []
            if (allPlayers.length > 0) {
                // Find the player with the highest combat score
                const topPlayer = allPlayers.reduce((best: any, cur: any) => {
                    const bestScore = best?.stats?.score || 0
                    const curScore = cur?.stats?.score || 0
                    return curScore > bestScore ? cur : best
                }, allPlayers[0])

                if (topPlayer?.puuid) {
                    console.log(`[MVP] Top scorer: ${topPlayer.gameName}#${topPlayer.tagLine} (Score: ${topPlayer.stats?.score})`)
                    // Map puuid to platform user_id
                    const { data: mvpAccount } = await supabaseClient
                        .from('riot_accounts')
                        .select('user_id')
                        .eq('puuid', topPlayer.puuid)
                        .single()

                    if (mvpAccount?.user_id) {
                        mvpProfileId = mvpAccount.user_id
                        console.log(`[MVP] Mapped to profile: ${mvpProfileId}`)
                    } else {
                        console.log(`[MVP] Player ${topPlayer.gameName} not linked to a platform account.`)
                    }
                }
            }
        } catch (mvpErr) {
            console.warn('[MVP] Non-critical MVP detection error:', mvpErr)
        }

        // 7. Update Database (brkt_match_games)
        const { error: upsertError } = await supabaseClient
            .from('brkt_match_games')
            .upsert({
                match_id: matchId,
                game_number: gameNumber,
                map_id: mapId,
                riot_match_id: riotMatchId,
                status: 'completed',
                winner_id: gameWinnerId,
                loser_id: gameLoserId,
                team1_score: t1Score,
                team2_score: t2Score,
                match_details: matchSnapshot,
                mvp_id: mvpProfileId,
                completed_at: new Date().toISOString()
            }, { onConflict: 'match_id, game_number' })

        if (upsertError) throw upsertError

        // 8. Update the original report status to 'accepted'
        const { error: patchError } = await supabaseClient
            .from('match_result_reports')
            .update({
                status: 'accepted',
                responded_by: user.id,
                responded_at: new Date().toISOString()
            })
            .eq('id', report.id)

        if (patchError) {
            console.warn(`[Process Result] Non-critical: Failed to update report status for ${report.id}:`, patchError)
        }


        // 7. Check for Series Completion
        const { data: allGames } = await supabaseClient
            .from('brkt_match_games')
            .select('winner_id')
            .eq('match_id', matchId)
            .eq('status', 'completed')

        if (allGames) {
            const t1Wins = allGames.filter(g => g.winner_id === brktMatch.team1_id).length
            const t2Wins = allGames.filter(g => g.winner_id === brktMatch.team2_id).length

            console.log(`[Series] Completion check for Match: ${matchId}. T1 Wins: ${t1Wins}, T2 Wins: ${t2Wins}`)

            // Check if BO series reached
            const mapsToWin = Math.ceil((brktMatch.best_of || 1) / 2)
            let seriesWinnerId = null

            if (t1Wins >= mapsToWin) seriesWinnerId = brktMatch.team1_id
            if (t2Wins >= mapsToWin) seriesWinnerId = brktMatch.team2_id

            const updateData: any = {
                team1_score: t1Wins,
                team2_score: t2Wins,
            }

            if (seriesWinnerId) {
                console.log(`[Series] Completion detected. Winner: ${seriesWinnerId}`)
                const seriesLoserId = seriesWinnerId === brktMatch.team1_id ? brktMatch.team2_id : brktMatch.team1_id;

                // Fire optimistic locking RPC instead of direct UPDATE
                const { data: lockSuccess, error: finalizeError } = await supabaseClient
                    .rpc('finalize_match_locked', {
                        p_match_id: matchId,
                        p_winner_id: seriesWinnerId,
                        p_loser_id: seriesLoserId,
                        p_expected_version: brktMatch.version || 1
                    });

                if (finalizeError) throw finalizeError

                if (!lockSuccess) {
                    console.log(`[Series] Match ${matchId} was already advanced by a concurrent process. Skipping duplicate advancement.`)
                }
            } else {
                // If not complete, just update the accumulated scores
                const { error: scoreUpdateError } = await supabaseClient
                    .from('brkt_matches')
                    .update({
                        team1_score: t1Wins,
                        team2_score: t2Wins
                    })
                    .eq('id', matchId)

                if (scoreUpdateError) throw scoreUpdateError
            }

            if (!seriesWinnerId) {
                console.log(`[Series] In progress. Required: ${mapsToWin}`)
            }
        }

        return new Response(JSON.stringify({
            success: true,
            gameWinner: gameWinnerId,
            t1Score,
            t2Score,
            matchSnapshot,
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

    } catch (error) {
        console.error(error)
        const errorMessage = error instanceof Error ? error.message : (error as any)?.message || 'An unexpected error occurred';
        return new Response(JSON.stringify({
            success: false,
            error: errorMessage
        }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }
})
