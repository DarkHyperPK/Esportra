import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { CommandButton } from '@/components/management/CommandSurface';
import { LABEL_CLASS } from '@/components/ui/kit/tone';
import { getAtPath } from '@/services/proposals/path';
import type { EditorOps } from './editorOps';
import { FieldList } from './FieldList';
import type { FieldSpec } from './fieldSpecs';

type RepeatSpec = Extract<FieldSpec, { kind: 'repeat' }>;

interface RepeatControlProps {
  doc: unknown;
  spec: RepeatSpec;
  path: string;
  ops: EditorOps;
}

/** A reorderable list of grouped fields (tiers, stats, partners, steps). */
export function RepeatControl({ doc, spec, path, ops }: RepeatControlProps) {
  const raw = getAtPath(doc, path);
  const count = Array.isArray(raw) ? raw.length : 0;
  return (
    <div className="space-y-3">
      <p className={LABEL_CLASS}>{spec.label}</p>
      {Array.from({ length: count }, (_, i) => {
        const titled = getAtPath(doc, `${path}.${i}.${spec.titleKey}`);
        const name = typeof titled === 'string' && titled.trim() ? titled : `${spec.itemLabel} ${i + 1}`;
        return (
          <div key={`${path}.${i}`} className="border border-white/10 bg-white/[0.02]">
            <div className="flex items-center justify-between gap-2 border-b border-white/[0.07] px-4 py-2.5">
              <span className="truncate font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-300">
                {String(i + 1).padStart(2, '0')} · {name}
              </span>
              <div className="flex shrink-0 gap-1">
                <CommandButton variant="ghost" size="icon" aria-label={`Move ${name} up`} disabled={i === 0} onClick={() => ops.move(path, i, i - 1)}>
                  <ArrowUp className="h-4 w-4" aria-hidden />
                </CommandButton>
                <CommandButton variant="ghost" size="icon" aria-label={`Move ${name} down`} disabled={i === count - 1} onClick={() => ops.move(path, i, i + 1)}>
                  <ArrowDown className="h-4 w-4" aria-hidden />
                </CommandButton>
                <CommandButton variant="danger" size="icon" aria-label={`Remove ${name}`} onClick={() => ops.remove(path, i)}>
                  <Trash2 className="h-4 w-4" aria-hidden />
                </CommandButton>
              </div>
            </div>
            <div className="p-4">
              <FieldList doc={doc} fields={spec.fields} base={`${path}.${i}`} ops={ops} />
            </div>
          </div>
        );
      })}
      <CommandButton variant="secondary" size="sm" onClick={() => ops.append(path, spec.blank())}>
        <Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden />
        Add {spec.itemLabel.toLowerCase()}
      </CommandButton>
    </div>
  );
}
