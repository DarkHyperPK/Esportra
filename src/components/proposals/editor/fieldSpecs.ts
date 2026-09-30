/** Declarative description of the editable fields. The editor renders any document from these, by path. */
export type FieldSpec =
  | { kind: 'text'; path: string; label: string; hint?: string; multiline?: boolean; inputType?: 'text' | 'date' | 'email' | 'url'; max?: number }
  | { kind: 'number'; path: string; label: string; hint?: string }
  | { kind: 'toggle'; path: string; label: string; hint: string }
  | { kind: 'list'; path: string; label: string; hint?: string; multiline?: boolean; max?: number }
  | {
      kind: 'repeat';
      path: string;
      label: string;
      itemLabel: string;
      /** Field (relative to the item) whose value names the item in the list. */
      titleKey: string;
      fields: FieldSpec[];
      blank: () => unknown;
    };

export interface SectionSpec {
  id: string;
  title: string;
  description?: string;
  fields: FieldSpec[];
}

const TOKEN_HINT = 'Use {brand} and {industry} to insert the prospect’s details. Put words in [square brackets] to set them in the rose italic accent.';

export const PROSPECT_SECTION: SectionSpec = {
  id: 'prospect',
  title: 'Prospect',
  description: 'Who this copy is prepared for. Everything else reads from these.',
  fields: [
    { kind: 'text', path: 'title', label: 'History name', hint: 'Only shown in your proposals list.', max: 120 },
    { kind: 'text', path: 'prospect.brandName', label: 'Brand name', max: 80 },
    { kind: 'text', path: 'prospect.industry', label: 'Industry', max: 80 },
    { kind: 'text', path: 'prospect.attention', label: 'Attention of', hint: 'Optional. A decision maker’s name.', max: 120 },
    { kind: 'text', path: 'preparedOn', label: 'Prepared on', inputType: 'date' },
  ],
};

export const COVER_SECTION: SectionSpec = {
  id: 'cover',
  title: 'Cover and closing lines',
  description: 'The first and last thing a reader sees. ' + TOKEN_HINT,
  fields: [
    { kind: 'text', path: 'coverHeadline', label: 'Cover title', hint: 'Words in [brackets] print in pink on their own line.', max: 120 },
    {
      kind: 'repeat', path: 'badges', label: 'Cover badges', itemLabel: 'Badge', titleKey: 'value',
      blank: () => ({ label: '', value: '' }),
      fields: [
        { kind: 'text', path: 'label', label: 'Caption', max: 40 },
        { kind: 'text', path: 'value', label: 'Badge', max: 60 },
      ],
    },
    { kind: 'text', path: 'coverLine', label: 'Cover sentence', hint: 'One sentence under the title.', multiline: true, max: 240 },
    { kind: 'text', path: 'closingLine', label: 'Closing headline', hint: 'Headline of the last page.', max: 200 },
    { kind: 'text', path: 'closingNote', label: 'Closing note', multiline: true, hint: 'Two sentences at most.', max: 600 },
  ],
};

export const IMAGES_SECTION: SectionSpec = {
  id: 'images',
  title: 'Images',
  description: 'Paths to files in public/proposals/ or full https links. Leave the cover empty to show the tournament page instead.',
  fields: [
    { kind: 'text', path: 'images.cover', label: 'Cover photo', hint: 'Optional. A real photo of your scene, dark and uncluttered.', max: 300 },
    { kind: 'text', path: 'images.page', label: 'Tournament page image', max: 300 },
    { kind: 'text', path: 'images.stream', label: 'Stream overlay image', hint: 'Swap this per brand: the default mockup shows earlier partners’ logos.', max: 300 },
  ],
};

export const ABOUT_SECTION: SectionSpec = {
  id: 'about',
  title: 'About Esportra and the numbers',
  description: 'Only figures that have already happened. Empty numbers are hidden.',
  fields: [
    { kind: 'text', path: 'about', label: 'About', multiline: true, max: 1200 },
    {
      kind: 'repeat', path: 'stats', label: 'Numbers', itemLabel: 'Number', titleKey: 'label',
      blank: () => ({ value: '', label: '', note: '' }),
      fields: [
        { kind: 'text', path: 'value', label: 'Value', max: 40 },
        { kind: 'text', path: 'label', label: 'Label', max: 80 },
        { kind: 'text', path: 'note', label: 'Note', hint: 'Optional.', max: 160 },
      ],
    },
    { kind: 'list', path: 'recognition', label: 'Recognition', max: 200 },
  ],
};

export const CLOSE_SECTIONS: SectionSpec[] = [
  {
    id: 'partners',
    title: 'Current partners',
    description: 'Logos are shown in a neutral well. Add a file to public/proposals/ and enter its path.',
    fields: [{
      kind: 'repeat', path: 'partners', label: 'Partners', itemLabel: 'Partner', titleKey: 'name',
      blank: () => ({ name: '', logoUrl: '', note: '' }),
      fields: [
        { kind: 'text', path: 'name', label: 'Name', max: 80 },
        { kind: 'text', path: 'logoUrl', label: 'Logo path', hint: 'e.g. /proposals/asus-logo.png. Empty shows the name in type.', max: 300 },
      ],
    }],
  },
  {
    id: 'terms',
    title: 'Terms',
    fields: [{ kind: 'list', path: 'terms', label: 'Terms', multiline: true, max: 300 }],
  },
  {
    id: 'sender',
    title: 'Contact',
    fields: [
      { kind: 'text', path: 'sender.name', label: 'Name', max: 80 },
      { kind: 'text', path: 'sender.title', label: 'Title', max: 80 },
      { kind: 'text', path: 'sender.company', label: 'Company', max: 80 },
      { kind: 'text', path: 'sender.email', label: 'Email', inputType: 'email', max: 120 },
      { kind: 'text', path: 'sender.website', label: 'Website', max: 120 },
      { kind: 'text', path: 'sender.discord', label: 'Discord', max: 120 },
      { kind: 'text', path: 'sender.phone', label: 'Phone', hint: 'Optional. Shown under your name on the last page.', max: 40 },
    ],
  },
];


export { TOKEN_HINT };
