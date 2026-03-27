export function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function safeSearchTerm(input: unknown, maxLength = 100): string {
  if (typeof input !== 'string') return '';
  return input.trim().slice(0, maxLength);
}

export function toIntInRange(value: string | null, fallback: number, min: number, max: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  if (Number.isNaN(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

export function sanitizeMongoObject<T extends Record<string, any>>(payload: T): T {
  const walk = (value: any): any => {
    if (Array.isArray(value)) return value.map(walk);
    if (!value || typeof value !== 'object') return value;

    const out: Record<string, any> = {};
    for (const [key, nested] of Object.entries(value)) {
      if (key.startsWith('$') || key.includes('.')) continue;
      out[key] = walk(nested);
    }
    return out;
  };

  return walk(payload);
}
