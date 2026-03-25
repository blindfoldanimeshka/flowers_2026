export function isValidId(id: string | null | undefined): id is string {
  return typeof id === 'string' && id.trim().length > 0;
}

