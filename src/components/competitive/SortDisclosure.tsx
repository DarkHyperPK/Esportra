interface SortDisclosureProps {
  text: string;
}

/**
 * SortDisclosure — mandatory sort transparency line above discovery results.
 * Always rendered. Never hidden. Never conditional.
 */
export function SortDisclosure({ text }: SortDisclosureProps) {
  return (
    <p className="font-sans text-[11px] text-white/35" role="note">
      {text}
    </p>
  );
}
