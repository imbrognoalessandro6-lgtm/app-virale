import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { TransactionRow } from '../../components/rows';
import { Button, Card, Chip, ChipRow, Empty, Field, Label, Screen, SectionTitle, textStyles } from '../../components/ui';
import { confirm, errorMessage, notify } from '../../lib/alert';
import { buildCsv, shareCsv } from '../../lib/csv';
import { formatEuro, parseItalianDate } from '../../lib/format';
import { totals } from '../../lib/stats';
import { useData, useStore } from '../../lib/store';
import { colors } from '../../lib/theme';
import type { TxType } from '../../lib/types';

export default function Movimenti() {
  const { deleteTransaction, premium } = useStore();
  const { transactions, categories, members } = useData();

  const [memberId, setMemberId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [type, setType] = useState<TxType | null>(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const fromISO = parseItalianDate(from);
  const toISO = parseItalianDate(to);

  const filtered = useMemo(
    () =>
      transactions.filter(
        (t) =>
          (!memberId || t.memberId === memberId) &&
          (!categoryId || t.categoryId === categoryId) &&
          (!type || t.type === type) &&
          (!fromISO || t.date >= fromISO) &&
          (!toISO || t.date <= toISO),
      ),
    [transactions, memberId, categoryId, type, fromISO, toISO],
  );
  const sum = totals(filtered);
  const catById = new Map(categories.map((c) => [c.id, c]));
  const memById = new Map(members.map((m) => [m.id, m]));
  const visibleCats = categories.filter((c) => !type || c.type === type);
  const activeFilters = [memberId, categoryId, type, fromISO, toISO].filter(Boolean).length;

  const reset = () => {
    setMemberId(null);
    setCategoryId(null);
    setType(null);
    setFrom('');
    setTo('');
  };

  const exportCsv = async () => {
    if (!premium) return router.push('/premium');
    if (!filtered.length) return notify('Nessun movimento da esportare');
    try {
      await shareCsv(buildCsv(filtered, categories, members));
    } catch (e) {
      notify('Esportazione non riuscita', errorMessage(e));
    }
  };

  const remove = async (id: string) => {
    if (await confirm('Eliminare il movimento?', 'Sparirà per tutti i membri della famiglia.', 'Elimina', true)) {
      deleteTransaction(id).catch((e) => notify('Errore', errorMessage(e)));
    }
  };

  return (
    <Screen title="Movimenti">
      <View style={styles.toolbar}>
        <Button
          label={activeFilters ? `Filtri (${activeFilters})` : 'Filtri'}
          icon="⚙︎"
          variant={showFilters ? 'secondary' : 'ghost'}
          onPress={() => setShowFilters((s) => !s)}
          style={{ flex: 1 }}
        />
        <Button label="CSV" icon={premium ? '⬇︎' : '🔒'} variant="ghost" onPress={exportCsv} style={{ flex: 1 }} />
      </View>

      {showFilters && (
        <Card>
          <Label>Profilo utente</Label>
          <ChipRow>
            <Chip label="Tutti" selected={!memberId} onPress={() => setMemberId(null)} />
            {members.map((m) => (
              <Chip key={m.id} label={m.name} color={m.color} selected={memberId === m.id} onPress={() => setMemberId(m.id)} />
            ))}
          </ChipRow>

          <Label>Tipo</Label>
          <ChipRow>
            <Chip label="Tutti" selected={!type} onPress={() => setType(null)} />
            <Chip label="Entrate" selected={type === 'entrata'} onPress={() => setType('entrata')} />
            <Chip label="Uscite" selected={type === 'uscita'} onPress={() => setType('uscita')} />
          </ChipRow>

          <Label>Categoria</Label>
          <ChipRow>
            <Chip label="Tutte" selected={!categoryId} onPress={() => setCategoryId(null)} />
            {visibleCats.map((c) => (
              <Chip key={c.id} label={c.name} selected={categoryId === c.id} onPress={() => setCategoryId(c.id)} />
            ))}
          </ChipRow>

          <View style={styles.dates}>
            <View style={{ flex: 1 }}>
              <Field label="Dal giorno" placeholder="GG/MM/AAAA" value={from} onChangeText={setFrom} />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Al giorno" placeholder="GG/MM/AAAA" value={to} onChangeText={setTo} />
            </View>
          </View>
          {(from && !fromISO) || (to && !toISO) ? (
            <Text style={[textStyles.muted, { color: colors.critical, marginTop: -8, marginBottom: 8 }]}>
              Formato data: GG/MM/AAAA
            </Text>
          ) : null}
          {activeFilters > 0 && <Button label="Azzera filtri" variant="ghost" onPress={reset} />}
        </Card>
      )}

      <Card>
        <View style={styles.summary}>
          <View>
            <Text style={textStyles.muted}>Entrate</Text>
            <Text style={[textStyles.strong, { color: colors.income }]}>{formatEuro(sum.income)}</Text>
          </View>
          <View>
            <Text style={textStyles.muted}>Uscite</Text>
            <Text style={[textStyles.strong, { color: colors.expense }]}>{formatEuro(sum.expense)}</Text>
          </View>
          <View>
            <Text style={textStyles.muted}>Saldo</Text>
            <Text style={textStyles.strong}>{formatEuro(sum.balance)}</Text>
          </View>
        </View>
      </Card>

      <SectionTitle>{filtered.length} movimenti</SectionTitle>
      <Card>
        {filtered.length ? (
          filtered.map((t) => (
            <TransactionRow
              key={t.id}
              tx={t}
              category={catById.get(t.categoryId)}
              member={memById.get(t.memberId)}
              onPress={() => remove(t.id)}
            />
          ))
        ) : (
          <Empty icon="🧾" text={activeFilters ? 'Nessun movimento con questi filtri.' : 'Ancora nessun movimento.'} />
        )}
      </Card>
      {filtered.length > 0 && <Text style={[textStyles.muted, { textAlign: 'center' }]}>Tocca un movimento per eliminarlo.</Text>}
    </Screen>
  );
}

const styles = StyleSheet.create({
  toolbar: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  dates: { flexDirection: 'row', gap: 10 },
  summary: { flexDirection: 'row', justifyContent: 'space-between' },
});
