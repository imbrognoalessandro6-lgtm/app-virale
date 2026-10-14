const euro = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' });

export function formatEuro(value: number): string {
  return euro.format(value);
}

export function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** Data locale in formato ISO YYYY-MM-DD. */
export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function addDays(iso: string, days: number): string {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** "2026-10-14" -> "14/10/2026" */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

/** "14/10/2026" (o "14-10-2026", "14.10.26") -> "2026-10-14"; null se non valida. */
export function parseItalianDate(text: string): string | null {
  const match = text.trim().match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2}|\d{4})$/);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  let year = Number(match[3]);
  if (year < 100) year += 2000;
  const d = new Date(year, month - 1, day);
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return null;
  return toISODate(d);
}

/** Interpreta importi scritti all'italiana: "1.234,50", "12,5", "12.50". */
export function parseAmount(text: string): number | null {
  let t = text.trim().replace(/\s|€/g, '');
  if (!t) return null;
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.');
  // "5.000" o "1.250.000" = separatore delle migliaia, non decimali.
  else if (/^\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, '');
  const n = Number(t);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
}

export function daysUntil(iso: string): number {
  const today = parseISODate(todayISO()).getTime();
  return Math.round((parseISODate(iso).getTime() - today) / 86_400_000);
}

export function describeDue(iso: string): string {
  const n = daysUntil(iso);
  if (n < 0) return n === -1 ? 'scaduta ieri' : `scaduta da ${-n} giorni`;
  if (n === 0) return 'scade oggi';
  if (n === 1) return 'scade domani';
  return `tra ${n} giorni`;
}

const MONTHS = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
const MONTHS_LONG = [
  'gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
  'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre',
];

/** "2026-10" */
export function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

export function shiftMonth(key: string, delta: number): string {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

export function monthShortLabel(key: string): string {
  return MONTHS[Number(key.slice(5, 7)) - 1];
}

export function monthLongLabel(key: string): string {
  return `${MONTHS_LONG[Number(key.slice(5, 7)) - 1]} ${key.slice(0, 4)}`;
}

export function randomId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}
