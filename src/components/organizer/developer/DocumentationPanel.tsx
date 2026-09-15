import { useState } from 'react';
import { ExternalLink, FileText } from 'lucide-react';
import { CommandButton, CommandEmptyState, CommandPanel, CommandSection } from '@/components/management/CommandSurface';

const DOCS_URL = '/api/v1/docs';

const CURL_EXAMPLE = `# List your tournaments
curl -X GET \\
  "${window?.location?.origin ?? ''}/api/v1/tournaments" \\
  -H "X-Api-Key: ek_sand_YOUR_API_KEY"

# Create a tournament
curl -X POST \\
  "${window?.location?.origin ?? ''}/api/v1/tournaments" \\
  -H "X-Api-Key: ek_sand_YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"name":"My Tournament","game":"valorant","format":"single_elimination"}'`;

export function DocumentationPanel() {
  const [iframeError, setIframeError] = useState(false);

  return (
    <div className="space-y-5">
      {/* Quick Start */}
      <CommandSection>
        <p className="mb-4 font-mono text-[10px] font-bold uppercase tracking-[0.35em] text-rose-400">
          Quick Start
        </p>
        <div className="space-y-4 text-sm text-zinc-300">
          <div className="flex gap-4">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center bg-rose-500 font-mono text-xs font-bold text-white">
              1
            </span>
            <p>Create a sandbox API key on the Keys tab above.</p>
          </div>
          <div className="flex gap-4">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center bg-rose-500 font-mono text-xs font-bold text-white">
              2
            </span>
            <p>
              Include your key in the request header:{' '}
              <code className="rounded-none bg-black/60 px-1 py-0.5 font-mono text-xs text-rose-300">
                X-Api-Key: &lt;your-key&gt;
              </code>
            </p>
          </div>
          <div className="flex gap-4">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center bg-rose-500 font-mono text-xs font-bold text-white">
              3
            </span>
            <p>Explore the interactive docs below.</p>
          </div>
        </div>

        <CommandPanel className="mt-5">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-zinc-500">
            Example curl
          </p>
          <pre className="overflow-x-auto text-xs text-emerald-300">{CURL_EXAMPLE}</pre>
        </CommandPanel>
      </CommandSection>

      {/* Interactive docs */}
      <CommandSection>
        <div className="mb-4 flex items-center justify-between">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.35em] text-rose-400">
            Interactive API Reference
          </p>
          <CommandButton
            variant="secondary"
            size="sm"
            asChild
          >
            <a href={DOCS_URL} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" />
              Open in New Tab
            </a>
          </CommandButton>
        </div>

        {iframeError ? (
          <CommandEmptyState
            title="Documentation unavailable"
            description="The interactive docs could not be loaded. Open them in a new tab instead."
            icon={<FileText className="h-5 w-5" />}
            action={
              <CommandButton asChild>
                <a href={DOCS_URL} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  Open Documentation
                </a>
              </CommandButton>
            }
          />
        ) : (
          <iframe
            src={DOCS_URL}
            className="h-[700px] w-full border-0"
            title="API Documentation"
            onError={() => setIframeError(true)}
          />
        )}
      </CommandSection>
    </div>
  );
}
