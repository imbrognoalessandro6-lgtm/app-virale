import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { CategoryDonut, MonthlyBars } from '../../components/charts';
import { Card, Chip, ChipRow, Empty, Screen, SectionTitle, textStyles } from '../../components/ui';
import { formatEuro, monthLongLabel, shiftMonth } from '../../lib/format';
import { currentMonthKey, expensesByCategory, inMonth, lastMonths, totals } from '../../lib/stats';
import { useData } from '../../lib/store';
import { colors } from '../../lib/theme';

export default function Analisi() {
  const { transactions, categories } = useData();
  const [range, setRange] = useState<'mese' | 'sei'>('mese');

  const now = currentMonthKey();
  const prev = shiftMonth(now, -1);
  const cur = totals(inMonth(transactions, now));
  const before = totals(inMonth(transactions, prev));
  const delta = cur.balance - before.balance;
  const deltaPct = before.balance !== 0 ? (delta / Math.abs(before.balance)) * 100 : null;

  const months = lastMonths(transactions, 6);
  const pieTxs = range === 'mese' ? inMonth(transactions, now) : transactions.filter((t) => t.date.slice(0, 7) >= months[0].key);
  const slices = expensesByCategory(pieTxs, categories);
  const up = delta >= 0;

  return (
    <Screen title="Analisi">
      <Card>
        <Text style={textStyles.secondary}>Saldo di {monthLongLabel(now)}</Text>
        <Text style={textStyles.big}>{formatEuro(cur.balance)}</Text>
        <View style={[styles.delta, { backgroundColor: up ? colors.goodSoft : colors.criticalSoft }]}>
          <Text style={{ color: up ? colors.good : colors.critical, fontWeight: '700' }}>
            {up ? '▲' : '▼'} {formatEuro(Math.abs(delta))}
            {deltaPct !== null ? ` (${up ? '+' : '−'}${Math.abs(deltaPct).toFixed(0)}%)` : ''}
          </Text>
          <Text style={textStyles.secondary}> rispetto a {monthLongLabel(prev).split(' ')[0]}</Text>
        </View>
        <View style={styles.row}>
          <View>
            <Text style={textStyles.muted}>Entrate del mese</Text>
            <Text style={textStyles.strong}>{formatEuro(cur.income)}</Text>
          </View>
          <View>
            <Text style={textStyles.muted}>Uscite del mese</Text>
            <Text style={textStyles.strong}>{formatEuro(cur.expense)}</Text>
          </View>
        </View>
      </Card>

      <SectionTitle>Entrate e uscite · ultimi 6 mesi</SectionTitle>
      <Card>
        <MonthlyBars data={months} />
      </Card>

      <SectionTitle>Dove vanno a finire i soldi</SectionTitle>
      <ChipRow>
        <Chip label="Questo mese" selected={range === 'mese'} onPress={() => setRange('mese')} />
        <Chip label="Ultimi 6 mesi" selected={range === 'sei'} onPress={() => setRange('sei')} />
      </ChipRow>
      <Card>
        {slices.length ? <CategoryDonut slices={slices} /> : <Empty icon="🥧" text="Nessuna uscita in questo periodo." />}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  delta: { flexDirection: 'row', alignSelf: 'flex-start', alignItems: 'center', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, marginTop: 6 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 },
});
