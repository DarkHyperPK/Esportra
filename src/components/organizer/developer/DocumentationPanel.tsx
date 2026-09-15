import { cn } from '@/lib/utils';
import { CommandPanel, CommandSection } from '@/components/management/CommandSurface';

const apiBase = import.meta.env.VITE_API_URL as string;

// ── Helpers ───────────────────────────────────────────────────────────────────

function MethodBadge({ method }: { method: string }) {
  const colors: Record<string, string> = {
    GET: 'border-blue-500/35 bg-blue-950/20 text-blue-300',
    POST: 'border-emerald-500/35 bg-emerald-950/20 text-emerald-300',
    PATCH: 'border-amber-500/35 bg-amber-950/20 text-amber-300',
    DELETE: 'border-red-500/35 bg-red-950/20 text-red-300',
  };
  return (
    <span className={cn('border px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider', colors[method] ?? 'border-white/10 text-zinc-400')}>
      {method}
    </span>
  );
}

function Endpoint({ method, path, description }: { method: string; path: string; description: string }) {
  return (
    <div className="flex items-start gap-3 border-b border-white/5 py-3 last:border-0">
      <MethodBadge method={method} />
      <div className="min-w-0">
        <code className="font-mono text-sm text-white">{path}</code>
        <p className="mt-0.5 text-xs text-zinc-500">{description}</p>
      </div>
    </div>
  );
}

function Field({ name, type, required, description }: { name: string; type: string; required?: boolean; description: string }) {
  return (
    <tr className="border-b border-white/5 last:border-0">
      <td className="py-2 pr-4 align-top">
        <code className="font-mono text-xs text-rose-300">{name}</code>
        {required && <span className="ml-1 text-[10px] text-rose-500">*</span>}
      </td>
      <td className="py-2 pr-4 align-top">
        <span className="font-mono text-[10px] text-zinc-500">{type}</span>
      </td>
      <td className="py-2 align-top text-xs text-zinc-400">{description}</td>
    </tr>
  );
}

function CodeBlock({ children }: { children: string }) {
  return (
    <CommandPanel className="p-0">
      <pre className="overflow-x-auto p-4 font-mono text-xs leading-relaxed text-emerald-300">{children}</pre>
    </CommandPanel>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-4 font-mono text-[10px] font-bold uppercase tracking-[0.35em] text-rose-400">
      {children}
    </p>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function DocumentationPanel() {
  return (
    <div className="space-y-5">

      {/* Authentication */}
      <CommandSection>
        <SectionLabel>Authentication</SectionLabel>
        <p className="mb-4 text-sm text-zinc-400">
          Pass your API key in the <code className="font-mono text-xs text-rose-300">X-Api-Key</code> header on every request.
        </p>
        <CodeBlock>{`curl ${apiBase}/api/v1/tournaments \\
  -H "X-Api-Key: ek_sand_YOUR_KEY"`}</CodeBlock>
        <p className="mt-3 text-xs text-zinc-500">
          Sandbox keys (<code className="font-mono text-rose-300/70">ek_sand_…</code>) operate on isolated test data.
          Live keys (<code className="font-mono text-rose-300/70">ek_live_…</code>) operate on production data and require approval.
          Rate limit: <strong className="text-zinc-300">60 requests / minute</strong> per key.
        </p>
      </CommandSection>

      {/* Workflow */}
      <CommandSection>
        <SectionLabel>Typical Workflow</SectionLabel>
        <div className="space-y-3">
          {[
            { n: 1, text: 'Create a tournament — response includes id and stage_id.' },
            { n: 2, text: 'Add participants — one call per participant, pass your own external_id.' },
            { n: 3, text: 'Generate the bracket — pass stage_id from step 1.' },
            { n: 4, text: 'List matches — poll or store match IDs as they progress.' },
            { n: 5, text: 'Report results — set winner and scores on each completed match.' },
            { n: 6, text: 'Get standings — final positions after all matches complete.' },
          ].map(({ n, text }) => (
            <div key={n} className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center bg-rose-500 font-mono text-xs font-bold text-white">{n}</span>
              <p className="pt-0.5 text-sm text-zinc-300">{text}</p>
            </div>
          ))}
        </div>
      </CommandSection>

      {/* Tournaments */}
      <CommandSection>
        <SectionLabel>Tournaments</SectionLabel>
        <div className="mb-4">
          <Endpoint method="POST"  path="/api/v1/tournaments"      description="Create a tournament. Returns id and stage_id." />
          <Endpoint method="GET"   path="/api/v1/tournaments/{id}" description="Get tournament details and participant count." />
          <Endpoint method="PATCH" path="/api/v1/tournaments/{id}" description="Update name, dates, region, or max participants (draft/open only)." />
          <Endpoint method="POST"  path="/api/v1/tournaments/{id}/publish" description="Publish the tournament (draft or open → published)." />
        </div>

        <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-zinc-500">POST /api/v1/tournaments — body</p>
        <table className="mb-4 w-full text-sm">
          <tbody>
            <Field name="name"             type="string"    required description="Tournament name." />
            <Field name="game"             type="string"    required description={`Game slug — e.g. "valorant", "csgo", "lol".`} />
            <Field name="format"           type="string"    required description={`Bracket format — "single_elimination", "double_elimination", "round_robin", "swiss".`} />
            <Field name="max_participants" type="integer"   required description="2–1024. Sets bracket capacity." />
            <Field name="start_date"       type="ISO 8601"  required description="Tournament start time." />
            <Field name="end_date"         type="ISO 8601"           description="Optional end time." />
            <Field name="region"           type="string"             description={`Optional region — e.g. "NA", "EU".`} />
          </tbody>
        </table>

        <CodeBlock>{`# Create a tournament
curl -X POST ${apiBase}/api/v1/tournaments \\
  -H "X-Api-Key: ek_sand_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Weekly Cup #1",
    "game": "valorant",
    "format": "single_elimination",
    "max_participants": 16,
    "start_date": "2026-10-01T18:00:00Z"
  }'

# Response — save both id and stage_id
{
  "id": "e3b0c442-...",
  "stage_id": "a1b2c3d4-...",
  "name": "Weekly Cup #1",
  "status": "draft",
  "environment": "sandbox"
}`}</CodeBlock>
      </CommandSection>

      {/* Participants */}
      <CommandSection>
        <SectionLabel>Participants</SectionLabel>
        <div className="mb-4">
          <Endpoint method="POST"   path="/api/v1/tournaments/{id}/participants"                 description="Add a participant. external_id is your own identifier." />
          <Endpoint method="GET"    path="/api/v1/tournaments/{id}/participants"                 description="List all participants." />
          <Endpoint method="DELETE" path="/api/v1/tournaments/{id}/participants/{participantId}" description="Remove a participant." />
        </div>

        <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-zinc-500">POST body</p>
        <table className="mb-4 w-full text-sm">
          <tbody>
            <Field name="external_id" type="string"  required description="Your stable identifier for this participant (max 255 chars). Must be unique within the tournament." />
            <Field name="name"        type="string"           description="Display name. Defaults to external_id if omitted." />
            <Field name="seeding"     type="integer"          description="Seed position for bracket placement." />
            <Field name="metadata"    type="object"           description="Arbitrary JSON — attach any data you need (player stats, team info, etc.)." />
          </tbody>
        </table>

        <CodeBlock>{`curl -X POST ${apiBase}/api/v1/tournaments/TOURNAMENT_ID/participants \\
  -H "X-Api-Key: ek_sand_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"external_id": "team-fnatic", "name": "Fnatic", "seeding": 1}'`}</CodeBlock>
      </CommandSection>

      {/* Brackets */}
      <CommandSection>
        <SectionLabel>Brackets</SectionLabel>
        <div className="mb-4">
          <Endpoint method="POST" path="/api/v1/tournaments/{id}/bracket/generate" description="Generate the bracket. Use stage_id from tournament creation." />
          <Endpoint method="POST" path="/api/v1/tournaments/{id}/bracket/seed"     description="Override seeding positions before generating." />
          <Endpoint method="GET"  path="/api/v1/tournaments/{id}/bracket"          description="Retrieve the current bracket with all matches." />
          <Endpoint method="GET"  path="/api/v1/tournaments/{id}/standings"        description="Final standings — positions, wins, and losses." />
        </div>

        <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-zinc-500">POST /bracket/generate — body</p>
        <table className="mb-4 w-full text-sm">
          <tbody>
            <Field name="stage_id"     type="uuid"    required description="stage_id from the tournament create response." />
            <Field name="best_of"      type="integer" required description="Match format — 1, 3, or 5." />
            <Field name="format"       type="string"           description="Override bracket format. Defaults to tournament format." />
            <Field name="bracket_size" type="integer"          description="Force a power-of-2 bracket size. Defaults to next power of 2 above participant count." />
          </tbody>
        </table>

        <CodeBlock>{`curl -X POST ${apiBase}/api/v1/tournaments/TOURNAMENT_ID/bracket/generate \\
  -H "X-Api-Key: ek_sand_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"stage_id": "STAGE_ID", "best_of": 3}'`}</CodeBlock>
      </CommandSection>

      {/* Matches */}
      <CommandSection>
        <SectionLabel>Matches</SectionLabel>
        <div className="mb-4">
          <Endpoint method="GET"   path="/api/v1/tournaments/{id}/matches" description="List all matches for a tournament, ordered by round." />
          <Endpoint method="GET"   path="/api/v1/matches/{matchId}"        description="Get a single match with scores and status." />
          <Endpoint method="POST"  path="/api/v1/matches/{matchId}/result"   description="Report a result — sets winner, scores, and marks match completed." />
          <Endpoint method="PATCH" path="/api/v1/matches/{matchId}/schedule" description="Set a scheduled time for a match." />
        </div>

        <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-zinc-500">POST /result — body</p>
        <table className="mb-4 w-full text-sm">
          <tbody>
            <Field name="winner_id"        type="uuid"    required description="participant_id of the winner (from the participants list)." />
            <Field name="score_participant1" type="integer" required description="Score for participant 1." />
            <Field name="score_participant2" type="integer" required description="Score for participant 2." />
          </tbody>
        </table>

        <CodeBlock>{`curl -X POST ${apiBase}/api/v1/matches/MATCH_ID/result \\
  -H "X-Api-Key: ek_sand_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "winner_id": "PARTICIPANT_ID",
    "score_participant1": 2,
    "score_participant2": 1
  }'`}</CodeBlock>
      </CommandSection>

      {/* Errors */}
      <CommandSection>
        <SectionLabel>Errors</SectionLabel>
        <div className="space-y-2">
          {[
            { code: '400', label: 'Bad Request',   desc: 'Missing or invalid field. Check the error message.' },
            { code: '401', label: 'Unauthorized',  desc: 'Missing or invalid API key.' },
            { code: '403', label: 'Forbidden',     desc: 'Valid key but wrong scope or resource belongs to another org.' },
            { code: '404', label: 'Not Found',     desc: 'Resource does not exist or belongs to another org.' },
            { code: '409', label: 'Conflict',      desc: 'Duplicate external_id, match already completed, etc.' },
            { code: '429', label: 'Rate Limited',  desc: 'Exceeded 60 req/min. Retry after the Retry-After header value.' },
          ].map(({ code, label, desc }) => (
            <div key={code} className="flex items-start gap-3 border-b border-white/5 pb-2 last:border-0">
              <code className="w-10 shrink-0 font-mono text-sm text-zinc-300">{code}</code>
              <p className="text-sm text-zinc-500"><span className="text-zinc-300">{label}</span> — {desc}</p>
            </div>
          ))}
        </div>
      </CommandSection>

    </div>
  );
}
