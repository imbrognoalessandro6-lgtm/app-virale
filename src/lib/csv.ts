import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { formatDate, todayISO } from './format';
import type { Category, Member, Transaction } from './types';

function cell(value: string): string {
  return /[";\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** CSV con ";" e virgola decimale: si apre correttamente con Excel in italiano. */
export function buildCsv(transactions: Transaction[], categories: Category[], members: Member[]): string {
  const cat = new Map(categories.map((c) => [c.id, c.name]));
  const mem = new Map(members.map((m) => [m.id, m.name]));
  const rows = [['Data', 'Tipo', 'Importo', 'Categoria', 'Utente', 'Note']];
  for (const t of transactions) {
    rows.push([
      formatDate(t.date),
      t.type === 'entrata' ? 'Entrata' : 'Uscita',
      (t.type === 'entrata' ? t.amount : -t.amount).toFixed(2).replace('.', ','),
      cat.get(t.categoryId) ?? '',
      mem.get(t.memberId) ?? '',
      t.note,
    ]);
  }
  return '﻿' + rows.map((r) => r.map(cell).join(';')).join('\n');
}

export async function shareCsv(csv: string): Promise<void> {
  const name = `movimenti-${todayISO()}.csv`;
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }
  const file = new File(Paths.cache, name);
  if (file.exists) file.delete();
  file.create();
  file.write(csv);
  await Sharing.shareAsync(file.uri, { mimeType: 'text/csv', dialogTitle: 'Esporta movimenti', UTI: 'public.comma-separated-values-text' });
}
