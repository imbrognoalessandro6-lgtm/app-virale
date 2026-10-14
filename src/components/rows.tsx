import { Pressable, StyleSheet, Text, View } from 'react-native';

import { daysUntil, describeDue, formatDate, formatEuro } from '../lib/format';
import { colors } from '../lib/theme';
import { DEADLINE_KINDS, type Category, type Deadline, type Member, type Transaction } from '../lib/types';

export function TransactionRow({
  tx,
  category,
  member,
  onPress,
}: {
  tx: Transaction;
  category?: Category;
  member?: Member;
  onPress?: () => void;
}) {
  const income = tx.type === 'entrata';
  return (
    <Pressable onPress={onPress} style={styles.row} accessibilityRole={onPress ? 'button' : undefined}>
      <View style={[styles.badge, { backgroundColor: income ? '#e8f1fc' : '#fdeee7' }]}>
        <Text style={{ fontSize: 16, color: income ? colors.income : colors.expense, fontWeight: '800' }}>
          {income ? '+' : '−'}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.title} numberOfLines={1}>
          {category?.name ?? 'Senza categoria'}
          {tx.note ? <Text style={styles.note}> · {tx.note}</Text> : null}
        </Text>
        <View style={styles.meta}>
          {member && <View style={[styles.dot, { backgroundColor: member.color }]} />}
          <Text style={styles.metaText}>
            {member?.name ?? '—'} · {formatDate(tx.date)}
          </Text>
        </View>
      </View>
      <Text style={styles.amount}>
        {income ? '+' : '−'}
        {formatEuro(tx.amount)}
      </Text>
    </Pressable>
  );
}

export function dueStatus(d: Deadline): { label: string; fg: string; bg: string } {
  if (d.paid) return { label: 'Pagata', fg: colors.good, bg: colors.goodSoft };
  const n = daysUntil(d.dueDate);
  const label = describeDue(d.dueDate);
  if (n < 0) return { label: `⚠️ ${label}`, fg: colors.critical, bg: colors.criticalSoft };
  if (n <= 7) return { label, fg: colors.warning, bg: colors.warningSoft };
  return { label, fg: colors.textSecondary, bg: colors.bg };
}

export function DeadlineRow({ d, onPress }: { d: Deadline; onPress?: () => void }) {
  const kind = DEADLINE_KINDS.find((k) => k.kind === d.kind);
  const status = dueStatus(d);
  return (
    <Pressable onPress={onPress} style={styles.row} accessibilityRole={onPress ? 'button' : undefined}>
      <View style={[styles.badge, { backgroundColor: colors.bg }]}>
        <Text style={{ fontSize: 18 }}>{kind?.icon ?? '📌'}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.title, d.paid && styles.paid]} numberOfLines={1}>
          {d.title}
        </Text>
        <View style={styles.meta}>
          <Text style={styles.metaText}>{formatDate(d.dueDate)}</Text>
          <View style={[styles.status, { backgroundColor: status.bg }]}>
            <Text style={[styles.statusText, { color: status.fg }]}>{status.label}</Text>
          </View>
        </View>
      </View>
      {d.amount !== null && <Text style={[styles.amount, d.paid && styles.paid]}>{formatEuro(d.amount)}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  badge: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 15, fontWeight: '600', color: colors.text },
  note: { fontWeight: '400', color: colors.textSecondary },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  metaText: { fontSize: 13, color: colors.textMuted },
  dot: { width: 8, height: 8, borderRadius: 4 },
  amount: { fontSize: 15, fontWeight: '700', color: colors.text, fontVariant: ['tabular-nums'] },
  paid: { textDecorationLine: 'line-through', color: colors.textMuted },
  status: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  statusText: { fontSize: 12, fontWeight: '600' },
});
