-- Fix schema for bracket generation and stage logic

DO $$
BEGIN
    -- 1. Fix stage_participants
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stage_participants') THEN
        -- Ensure team_id exists
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stage_participants' AND column_name = 'team_id') THEN
            ALTER TABLE public.stage_participants ADD COLUMN team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE;
        END IF;
    END IF;

    -- 2. Fix tournament_matches
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tournament_matches') THEN
        -- Add stage_id
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tournament_matches' AND column_name = 'stage_id') THEN
            ALTER TABLE public.tournament_matches ADD COLUMN stage_id UUID REFERENCES public.tournament_stages(id) ON DELETE CASCADE;
        END IF;

        -- Add team1_id
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tournament_matches' AND column_name = 'team1_id') THEN
            ALTER TABLE public.tournament_matches ADD COLUMN team1_id UUID REFERENCES public.teams(id);
        END IF;

        -- Add team2_id
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tournament_matches' AND column_name = 'team2_id') THEN
            ALTER TABLE public.tournament_matches ADD COLUMN team2_id UUID REFERENCES public.teams(id);
        END IF;

        -- Add winner_team_id
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tournament_matches' AND column_name = 'winner_team_id') THEN
            ALTER TABLE public.tournament_matches ADD COLUMN winner_team_id UUID REFERENCES public.teams(id);
        END IF;

        -- Add bracket_side
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tournament_matches' AND column_name = 'bracket_side') THEN
            ALTER TABLE public.tournament_matches ADD COLUMN bracket_side TEXT DEFAULT 'winners';
        END IF;
        
        -- Add match_number if missing (it should exist but just in case)
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tournament_matches' AND column_name = 'match_number') THEN
            ALTER TABLE public.tournament_matches ADD COLUMN match_number INTEGER;
        END IF;

         -- Add next_match_id if missing
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tournament_matches' AND column_name = 'next_match_id') THEN
            ALTER TABLE public.tournament_matches ADD COLUMN next_match_id UUID REFERENCES public.tournament_matches(id);
        END IF;
        
         -- Add loser_next_match_id for Double Elim
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tournament_matches' AND column_name = 'loser_next_match_id') THEN
            ALTER TABLE public.tournament_matches ADD COLUMN loser_next_match_id UUID REFERENCES public.tournament_matches(id);
        END IF;

        -- Add team1_score and team2_score
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tournament_matches' AND column_name = 'team1_score') THEN
            ALTER TABLE public.tournament_matches ADD COLUMN team1_score INTEGER DEFAULT 0;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tournament_matches' AND column_name = 'team2_score') THEN
            ALTER TABLE public.tournament_matches ADD COLUMN team2_score INTEGER DEFAULT 0;
        END IF;
        
        -- Add status if missing
         IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tournament_matches' AND column_name = 'status') THEN
            ALTER TABLE public.tournament_matches ADD COLUMN status TEXT DEFAULT 'pending';
        END IF;
        
        -- Add is_bye
         IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tournament_matches' AND column_name = 'is_bye') THEN
            ALTER TABLE public.tournament_matches ADD COLUMN is_bye BOOLEAN DEFAULT false;
        END IF;

    END IF;
END $$;
