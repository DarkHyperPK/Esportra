/** Pure path helpers for editing a nested document immutably ("tiers.0.features.2"). */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function split(path: string): string[] {
  return path.split('.').filter((s) => s.length > 0);
}

export function getAtPath(root: unknown, path: string): unknown {
  return split(path).reduce<unknown>((node, key) => {
    if (Array.isArray(node)) return node[Number(key)];
    if (isRecord(node)) return node[key];
    return undefined;
  }, root);
}

function setIn(node: unknown, keys: string[], value: unknown): unknown {
  if (keys.length === 0) return value;
  const [head, ...rest] = keys;
  if (Array.isArray(node)) {
    const index = Number(head);
    return node.map((item, i) => (i === index ? setIn(item, rest, value) : item));
  }
  if (isRecord(node)) return { ...node, [head]: setIn(node[head], rest, value) };
  return node;
}

export function setAtPath(root: unknown, path: string, value: unknown): unknown {
  return setIn(root, split(path), value);
}

export function appendAtPath(root: unknown, path: string, item: unknown): unknown {
  const current = getAtPath(root, path);
  return setAtPath(root, path, Array.isArray(current) ? [...current, item] : [item]);
}

export function removeAtPath(root: unknown, path: string, index: number): unknown {
  const current = getAtPath(root, path);
  if (!Array.isArray(current)) return root;
  return setAtPath(root, path, current.filter((_, i) => i !== index));
}

export function moveAtPath(root: unknown, path: string, from: number, to: number): unknown {
  const current = getAtPath(root, path);
  if (!Array.isArray(current) || to < 0 || to >= current.length) return root;
  const next = [...current];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return setAtPath(root, path, next);
}
