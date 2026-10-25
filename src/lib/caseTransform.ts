/**
 * caseTransform.ts
 *
 * Recursive key-casing converters for the apiClient boundary.
 * Outgoing requests: toSnakeCaseDeep (camelCase → snake_case)
 * Incoming responses: toCamelCaseDeep (snake_case → camelCase)
 *
 * Rules:
 * - Only object keys are transformed; string values are left unchanged
 * - Arrays are traversed recursively; primitive arrays pass through unchanged
 * - null, undefined, Date, File, Blob instances pass through unchanged
 * - Conversion is idempotent: already-correct keys are not re-processed
 */

function toSnakeCase(str: string): string {
  return str.replace(/([A-Z])/g, '_$1').toLowerCase();
}

function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
}

export function toSnakeCaseDeep(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (obj instanceof Date || obj instanceof File || obj instanceof Blob) return obj;
  if (Array.isArray(obj)) return obj.map(toSnakeCaseDeep);
  if (typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>).map(([k, v]) => [
        toSnakeCase(k),
        toSnakeCaseDeep(v),
      ]),
    );
  }
  return obj;
}

export function toCamelCaseDeep(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (obj instanceof Date) return obj;
  if (Array.isArray(obj)) return obj.map(toCamelCaseDeep);
  if (typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>).map(([k, v]) => [
        toCamelCase(k),
        toCamelCaseDeep(v),
      ]),
    );
  }
  return obj;
}
