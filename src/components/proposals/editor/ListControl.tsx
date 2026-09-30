import { Plus, X } from 'lucide-react';
import { Field } from '@/components/ui/kit/Field';
import { CONTROL_CLASS } from '@/components/ui/kit/tone';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CommandButton } from '@/components/management/CommandSurface';
import { cn } from '@/lib/utils';
import type { EditorOps } from './editorOps';
import type { FieldSpec } from './fieldSpecs';

type ListSpec = Extract<FieldSpec, { kind: 'list' }>;

interface ListControlProps {
  spec: ListSpec;
  path: string;
  id: string;
  value: unknown;
  ops: EditorOps;
}

/** An editable list of short strings: one row per entry, add and remove. */
export function ListControl({ spec, path, id, value, ops }: ListControlProps) {
  const items = Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
  const Control = spec.multiline ? Textarea : Input;
  return (
    <Field label={spec.label} htmlFor={`${id}-0`} hint={spec.hint}>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={`${path}.${i}`} className="flex items-start gap-2">
            <Control
              id={`${id}-${i}`}
              value={item}
              maxLength={spec.max}
              aria-label={`${spec.label} ${i + 1}`}
              onChange={(e) => ops.set(`${path}.${i}`, e.target.value)}
              className={cn(CONTROL_CLASS, spec.multiline && 'min-h-[76px] py-3')}
            />
            <CommandButton
              variant="ghost"
              size="icon"
              className="mt-1 shrink-0"
              aria-label={`Remove ${spec.label} ${i + 1}`}
              onClick={() => ops.remove(path, i)}
            >
              <X className="h-4 w-4" aria-hidden />
            </CommandButton>
          </div>
        ))}
        <CommandButton variant="secondary" size="sm" onClick={() => ops.append(path, '')}>
          <Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden />
          Add entry
        </CommandButton>
      </div>
    </Field>
  );
}
