export const AVATAR_STYLES = [
    { id: 'critters',       label: 'Critters' },
    { id: 'adventurer',     label: 'Adventurer' },
    { id: 'pixel-art',      label: 'Pixel Art' },
    { id: 'bottts',         label: 'Robots' },
    { id: 'fun-emoji',      label: 'Emoji' },
    { id: 'big-smile',      label: 'Big Smile' },
    { id: 'micah',          label: 'Micah' },
    { id: 'notionists',     label: 'Notionist' },
    { id: 'open-peeps',     label: 'Peeps' },
    { id: 'lorelei',        label: 'Lorelei' },
    { id: 'shapes',         label: 'Shapes' },
    { id: 'thumbs',         label: 'Thumbs' },
] as const;

export type AvatarStyleId = (typeof AVATAR_STYLES)[number]['id'];

export const DEFAULT_STYLE: AvatarStyleId = 'critters';

export interface DiceBearResult { type: 'dicebear'; style: AvatarStyleId; seed: string; avatarUrl: string }
export interface PhotoResult    { type: 'photo';    avatarUrl: string }
export type AvatarPickerSelection = DiceBearResult | PhotoResult;
