/** Edit operations the field renderer calls. Paths are absolute ("tiers.0.features"). */
export interface EditorOps {
  set: (path: string, value: unknown) => void;
  append: (path: string, item: unknown) => void;
  remove: (path: string, index: number) => void;
  move: (path: string, from: number, to: number) => void;
}
