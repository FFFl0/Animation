export function todayDateStr(): string {
  return new Date().toISOString().slice(0, 10);
}
