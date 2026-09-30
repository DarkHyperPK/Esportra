import type { Proposal } from '@/schemas/proposal';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import type { EditorOps } from './editorOps';
import { FieldList } from './FieldList';
import { ABOUT_SECTION, CLOSE_SECTIONS, PROSPECT_SECTION, type SectionSpec } from './fieldSpecs';
import { PLATFORM_SECTIONS } from './platformSpecs';
import { TOURNAMENT_SECTIONS } from './tournamentSpecs';

function sectionsFor(kind: Proposal['kind']): SectionSpec[] {
  const own = kind === 'tournament' ? TOURNAMENT_SECTIONS : PLATFORM_SECTIONS;
  return [PROSPECT_SECTION, ABOUT_SECTION, ...own, ...CLOSE_SECTIONS];
}

/** Every editable field of a proposal, grouped in collapsible sections that follow the document order. */
export function EditorForm({ doc, ops }: { doc: Proposal; ops: EditorOps }) {
  return (
    <Accordion type="multiple" defaultValue={['prospect']} className="border border-white/10">
      {sectionsFor(doc.kind).map((section) => (
        <AccordionItem key={section.id} value={section.id} className="border-white/[0.07] px-4 last:border-b-0">
          <AccordionTrigger className="font-heading text-base font-bold text-white hover:no-underline">
            {section.title}
          </AccordionTrigger>
          <AccordionContent className="pb-6">
            {section.description && <p className="mb-5 text-[13px] leading-relaxed text-zinc-500">{section.description}</p>}
            <FieldList doc={doc} fields={section.fields} ops={ops} />
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
