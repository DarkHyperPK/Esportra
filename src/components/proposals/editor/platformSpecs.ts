import { STEPS_FIELD, type SectionSpec } from './fieldSpecs';

export const PLATFORM_SECTIONS: SectionSpec[] = [
  {
    id: 'outlook',
    title: 'Where we are headed',
    fields: [{ kind: 'text', path: 'outlook', label: 'Outlook', multiline: true, max: 600 }],
  },
  {
    id: 'audiences',
    title: 'Who is on the platform',
    fields: [{
      kind: 'repeat', path: 'audiences', label: 'Groups', itemLabel: 'Group', titleKey: 'who',
      blank: () => ({ who: '', body: '' }),
      fields: [
        { kind: 'text', path: 'who', label: 'Who', max: 60 },
        { kind: 'text', path: 'body', label: 'Description', multiline: true, max: 300 },
      ],
    }],
  },
  {
    id: 'tiers',
    title: 'Partnership levels',
    description: 'Described by value, with no prices. Rename or add levels freely.',
    fields: [{
      kind: 'repeat', path: 'tiers', label: 'Levels', itemLabel: 'Level', titleKey: 'name',
      blank: () => ({ name: '', label: '', summary: '', featured: false, points: [] }),
      fields: [
        { kind: 'text', path: 'name', label: 'Name', max: 40 },
        { kind: 'text', path: 'label', label: 'Label', max: 60 },
        { kind: 'text', path: 'summary', label: 'Summary', multiline: true, max: 300 },
        { kind: 'toggle', path: 'featured', label: 'Feature this level', hint: 'Sets it apart as a full-width band with the notch. Use it for one level only.' },
        { kind: 'list', path: 'points', label: 'What it includes', max: 200 },
      ],
    }],
  },
  {
    id: 'zones',
    title: 'Placement zones',
    fields: [{
      kind: 'repeat', path: 'zones', label: 'Zones', itemLabel: 'Zone', titleKey: 'name',
      blank: () => ({ name: '', desc: '', tiers: '' }),
      fields: [
        { kind: 'text', path: 'name', label: 'Zone', max: 60 },
        { kind: 'text', path: 'desc', label: 'What it is', max: 160 },
        { kind: 'text', path: 'tiers', label: 'Available to', max: 80 },
      ],
    }],
  },
  {
    id: 'portal',
    title: 'Portal and process',
    fields: [
      { kind: 'list', path: 'portalPoints', label: 'Partner portal points', max: 200 },
      STEPS_FIELD,
    ],
  },
];
