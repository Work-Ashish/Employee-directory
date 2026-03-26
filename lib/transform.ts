/**
 * camelCase ↔ snake_case transform layer for Django API communication.
 * Frontend uses camelCase; Django REST Framework uses snake_case.
 */

function camelToSnake(str: string): string {
  return str
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
    .replace(/([a-z\d])([A-Z])/g, '$1_$2')
    .toLowerCase();
}

function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

function transformKeys(
  obj: unknown,
  keyTransform: (key: string) => string
): unknown {
  if (Array.isArray(obj)) {
    return obj.map((item) => transformKeys(item, keyTransform));
  }
  if (obj !== null && typeof obj === "object" && !(obj instanceof Date)) {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      result[keyTransform(key)] = transformKeys(value, keyTransform);
    }
    return result;
  }
  return obj;
}

/** Convert request body keys from camelCase → snake_case */
export function toSnakeCase<T = Record<string, unknown>>(obj: T): T {
  return transformKeys(obj, camelToSnake) as T;
}

/** Convert response body keys from snake_case → camelCase */
export function toCamelCase<T = Record<string, unknown>>(obj: T): T {
  return transformKeys(obj, snakeToCamel) as T;
}
