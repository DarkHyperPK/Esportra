import { Field } from '@/components/ui/kit/Field';
import { ToggleRow } from '@/components/ui/kit/ToggleRow';
import { CONTROL_CLASS } from '@/components/ui/kit/tone';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { getAtPath } from '@/services/proposals/path';
import type { EditorOps } from './editorOps';
import type { FieldSpec } from './fieldSpecs';
import { ListControl } from './ListControl';
import { RepeatControl } from './RepeatControl';

interface FieldListProps {
  doc: unknown;
  fields: FieldSpec[];
  /** Path prefix for relative field paths (a repeat item's own path). */
  base?: string;
  ops: EditorOps;
}

function fieldId(path: string): string {
  return `proposal-${path.replace(/\./g, '-')}`;
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

/** Renders any list of FieldSpecs against the document. Text, number, toggle, list and repeat. */
export function FieldList({ doc, fields, base = '', ops }: FieldListProps) {
  return (
    <div className="space-y-5">
      {fields.map((field) => {
        const path = base ? `${base}.${field.path}` : field.path;
        const id = fieldId(path);
        const value = getAtPath(doc, path);

        if (field.kind === 'text') {
          const Control = field.multiline ? Textarea : Input;
          return (
            <Field key={path} label={field.label} htmlFor={id} hint={field.hint}>
              <Control
                id={id}
                type={field.multiline ? undefined : field.inputType ?? 'text'}
                value={asString(value)}
                maxLength={field.max}
                onChange={(e) => ops.set(path, e.target.value)}
                className={cn(CONTROL_CLASS, field.multiline && 'min-h-[110px] py-3')}
              />
            </Field>
          );
        }
        if (field.kind === 'number') {
          return (
            <Field key={path} label={field.label} htmlFor={id} hint={field.hint}>
              <Input
                id={id}
                type="number"
                inputMode="numeric"
                min={0}
                value={typeof value === 'number' ? value : 0}
                onChange={(e) => ops.set(path, Math.max(0, Number(e.target.value) || 0))}
                className={cn(CONTROL_CLASS, 'tabular-nums')}
              />
            </Field>
          );
        }
        if (field.kind === 'toggle') {
          return (
            <ToggleRow
              key={path}
              id={id}
              title={field.label}
              description={field.hint}
              checked={value === true}
              onCheckedChange={(checked) => ops.set(path, checked)}
            />
          );
        }
        if (field.kind === 'list') {
          return <ListControl key={path} spec={field} path={path} id={id} value={value} ops={ops} />;
        }
        return <RepeatControl key={path} doc={doc} spec={field} path={path} ops={ops} />;
      })}
    </div>
  );
}
