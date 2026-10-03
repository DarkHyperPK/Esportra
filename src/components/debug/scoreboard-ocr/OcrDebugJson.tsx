import { useState } from 'react';
import { Check, Copy, Download } from 'lucide-react';
import { GhostButton } from '@/components/ui/app-buttons';
import { HINT_CLASS } from '@/components/ui/kit';
import { toFixtureJson } from '@/services/scoreboardOcr';
import type { ScoreboardOcrResult } from '@/types/scoreboardOcr';

function download(name: string, data: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

/** Raw JSON plus exports: full result, or a fixture for the OCR accuracy test. */
export function OcrDebugJson({ result, fileName }: { result: ScoreboardOcrResult; fileName: string }) {
  const [copied, setCopied] = useState(false);
  const base = fileName.replace(/\.[^.]+$/, '') || 'scoreboard';
  const json = JSON.stringify(result, null, 2);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(json);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <GhostButton type="button" onClick={copy}>
          {copied ? <Check className="mr-2 h-4 w-4" aria-hidden /> : <Copy className="mr-2 h-4 w-4" aria-hidden />}
          {copied ? 'Copied' : 'Copy JSON'}
        </GhostButton>
        <GhostButton type="button" onClick={() => download(`${base}.result.json`, result)}>
          <Download className="mr-2 h-4 w-4" aria-hidden /> result.json
        </GhostButton>
        <GhostButton type="button" onClick={() => download(`${base}.json`, toFixtureJson(result))}>
          <Download className="mr-2 h-4 w-4" aria-hidden /> fixture.json
        </GhostButton>
      </div>
      <p className={HINT_CLASS}>
        fixture.json matches services/scoreboard-ocr/tests/fixtures/real. Fix any wrong values, then commit it next to the screenshot.
      </p>
      <pre className="max-h-[32rem] overflow-auto overscroll-contain border border-white/[0.07] bg-black/50 p-3 font-mono text-xs leading-relaxed text-zinc-300" data-lenis-prevent>
        {json}
      </pre>
    </div>
  );
}
