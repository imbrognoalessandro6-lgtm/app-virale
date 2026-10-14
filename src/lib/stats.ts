import { monthKey, shiftMonth, todayISO } from './format';
import type { Category, Transaction } from './types';

export interface Totals {
  income: number;
  expense: number;
  balance: number;
}

export function totals(txs: Transaction[]): Totals {
  let income = 0;
  let expense = 0;
  for (const t of txs) {
    if (t.type === 'entrata') income += t.amount;
    else expense += t.amount;
  }
  return { income, expense, balance: income - expense };
}

export function inMonth(txs: Transaction[], key: string): Transaction[] {
  return txs.filter((t) => monthKey(t.date) === key);
}

export function currentMonthKey(): string {
  return monthKey(todayISO());
}

/** Entrate e uscite degli ultimi `n` mesi (incluso il corrente), dal più vecchio al più recente. */
export function lastMonths(txs: Transaction[], n = 6): { key: string; income: number; expense: number }[] {
  const now = currentMonthKey();
  return Array.from({ length: n }, (_, i) => {
    const key = shiftMonth(now, i - (n - 1));
    const t = totals(inMonth(txs, key));
    return { key, income: t.income, expense: t.expense };
  });
}

export interface Slice {
  label: string;
  value: number;
}

/** Spese per categoria, ordinate dalla più grande. Oltre `max` voci, il resto confluisce in "Altro". */
export function expensesByCategory(txs: Transaction[], categories: Category[], max = 6): Slice[] {
  const names = new Map(categories.map((c) => [c.id, c.name]));
  const sums = new Map<string, number>();
  for (const t of txs) {
    if (t.type !== 'uscita') continue;
    const name = names.get(t.categoryId) ?? 'Senza categoria';
    sums.set(name, (sums.get(name) ?? 0) + t.amount);
  }
  const sorted = [...sums.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
  if (sorted.length <= max + 1) return sorted;
  const rest = sorted.slice(max).reduce((s, x) => s + x.value, 0);
  return [...sorted.slice(0, max), { label: 'Altro', value: rest }];
}
