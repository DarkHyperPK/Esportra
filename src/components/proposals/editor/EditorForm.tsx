import type { Proposal } from '@/schemas/proposal';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import type { ReadinessIssue } from '@/services/proposals/readiness';
import type { EditorOps } from './editorOps';
import { FieldList } from './FieldList';
import { ABOUT_SECTION, CLOSE_SECTIONS, COVER_SECTION, IMAGES_SECTION, PROSPECT_SECTION, type SectionSpec } from './fieldSpecs';
import { PLATFORM_SECTIONS } from './platformSpecs';
import { TOURNAMENT_SECTIONS } from './tournamentSpecs';

function sectionsFor(kind: Proposal['kind']): SectionSpec[] {
  const own = kind === 'tournament' ? TOURNAMENT_SECTIONS : PLATFORM_SECTIONS;
  return [PROSPECT_SECTION, COVER_SECTION, IMAGES_SECTION, ABOUT_SECTION, ...own, ...CLOSE_SECTIONS];
}

interface EditorFormProps {
  doc: Proposal;
  ops: EditorOps;
  open: string[];
  onOpenChange: (next: string[]) => void;
  issues: ReadinessIssue[];
}

/** Every editable field, in collapsible sections that follow the document's order. */
export function EditorForm({ doc, ops, open, onOpenChange, issues }: EditorFormProps) {
  const sections = sectionsFor(doc.kind);
  return (
    <Accordion type="multiple" value={open} onValueChange={onOpenChange} className="border border-white/10 bg-[#0a0a0c]/92">
      {sections.map((section, index) => {
        const count = issues.filter((i) => i.sectionId === section.id).length;
        return (
          <AccordionItem key={section.id} value={section.id} id={`editor-section-${section.id}`} className="scroll-mt-4 border-white/[0.07] px-4 last:border-b-0">
            <AccordionTrigger className="gap-3 hover:no-underline">
              <span className="flex min-w-0 flex-1 items-center gap-3 text-left">
                <span className="font-mono text-[10px] font-semibold tabular-nums text-zinc-600">{String(index + 1).padStart(2, '0')}</span>
                <span className="truncate font-heading text-[15px] font-bold text-white">{section.title}</span>
                {count > 0 && (
                  <span className="ml-auto flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-300">
                    <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                    {count} to check
                  </span>
                )}
              </span>
            </AccordionTrigger>
            <AccordionContent className="pb-6">
              {section.description && <p className="mb-5 text-[13px] leading-relaxed text-zinc-500">{section.description}</p>}
              <FieldList doc={doc} fields={section.fields} ops={ops} />
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}
