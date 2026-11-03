/**
 * Chart colours: the first three slots of the validated categorical palette, stepped for the dark surface, plus text tokens.
 * Blue is your team, orange the opponent, aqua a third series. Colour is never the only carrier: every bar and point has a value label.
 */
export const CHART = {
  you: '#3987e5', them: '#d95926', third: '#199e70',
  grid: 'rgba(255,255,255,0.08)', axis: '#8b8a85', text: '#c3c2b7',
} as const;
