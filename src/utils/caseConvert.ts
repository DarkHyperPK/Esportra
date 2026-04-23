/** Convert snake_case string to camelCase */
export function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, ch) => ch.toUpperCase());
}

/** Convert camelCase / PascalCase string to snake_case */
export function toSnakeCase(str: string): string {
  return str
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, '');
}

/** Recursively convert all keys of an object from snake_case to camelCase */
export function keysToCamel<T = unknown>(obj: unknown): T {
  if (Array.isArray(obj)) return obj.map(keysToCamel) as T;
  if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>).map(([k, v]) => [
        toCamelCase(k),
        keysToCamel(v),
      ])
    ) as T;
  }
  return obj as T;
}
