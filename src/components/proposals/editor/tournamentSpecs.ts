import { STEPS_FIELD, TOKEN_HINT, type SectionSpec } from './fieldSpecs';

export const TOURNAMENT_SECTIONS: SectionSpec[] = [
  {
    id: 'event',
    title: 'The event',
    description: 'Empty fields are hidden from the document.',
    fields: [
      { kind: 'text', path: 'event.name', label: 'Event name', max: 80 },
      { kind: 'text', path: 'event.edition', label: 'Edition line', max: 80 },
      { kind: 'text', path: 'event.game', label: 'Game', max: 60 },
      { kind: 'text', path: 'event.startDate', label: 'Start date', inputType: 'date' },
      { kind: 'text', path: 'event.channels', label: 'Stream channels', max: 120 },
      { kind: 'text', path: 'event.format', label: 'Format', hint: 'Left empty until confirmed.', max: 120 },
      { kind: 'text', path: 'event.prizePool', label: 'Prize pool', hint: 'Write it in full, e.g. PKR 150,000.', max: 80 },
      { kind: 'text', path: 'event.next', label: 'What comes next', max: 200 },
    ],
  },
  {
    id: 'audience',
    title: 'Who the partner reaches',
    description: TOKEN_HINT,
    fields: [
      { kind: 'text', path: 'audienceHeading', label: 'Heading', max: 120 },
      { kind: 'text', path: 'audienceBody', label: 'Paragraph', multiline: true, max: 1200 },
      { kind: 'list', path: 'audiencePoints', label: 'Audience points', max: 200 },
    ],
  },
  {
    id: 'tiers',
    title: 'Packages',
    description: 'Each tier lists only what it adds. Use {brand} for the partner’s name.',
    fields: [{
      kind: 'repeat', path: 'tiers', label: 'Packages', itemLabel: 'Package', titleKey: 'name',
      blank: () => ({
        name: '', price: 0, currency: 'PKR', tagline: '', availability: 'Open',
        includesPrevious: true, featured: false, features: [],
      }),
      fields: [
        { kind: 'text', path: 'name', label: 'Name', max: 40 },
        { kind: 'number', path: 'price', label: 'Price' },
        { kind: 'text', path: 'currency', label: 'Currency', max: 8 },
        { kind: 'text', path: 'tagline', label: 'Tagline', max: 120 },
        { kind: 'text', path: 'availability', label: 'Availability', max: 80 },
        { kind: 'toggle', path: 'includesPrevious', label: 'Includes the tier above it', hint: 'Shows "Everything in …, plus".' },
        { kind: 'toggle', path: 'featured', label: 'Highlight this package', hint: 'Lifts it one tone. No colour change.' },
        { kind: 'list', path: 'features', label: 'What it adds', max: 200 },
      ],
    }],
  },
  {
    id: 'placements',
    title: 'Placement table and process',
    description: 'Give each placement one cell per package, in package order. Use — for not included.',
    fields: [
      {
        kind: 'repeat', path: 'zoneRows', label: 'Placements', itemLabel: 'Placement', titleKey: 'zone',
        blank: () => ({ zone: '', cells: [] }),
        fields: [
          { kind: 'text', path: 'zone', label: 'Placement', max: 60 },
          { kind: 'list', path: 'cells', label: 'Cells, one per package', max: 60 },
        ],
      },
      STEPS_FIELD,
    ],
  },
];
