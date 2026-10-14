import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { DeadlineRow, TransactionRow } from '../../components/rows';
import { Button, Card, ProgressBar, Screen, SectionTitle, textStyles } from '../../components/ui';
import { notify } from '../../lib/alert';
import { formatDate, formatEuro, parseISODate, todayISO } from '../../lib/format';
import { shareInvite } from '../../lib/invite';
import { totals } from '../../lib/stats';
import { useData, useStore } from '../../lib/store';
import { colors } from '../../lib/theme';

function monthsBetween(fromISO: string, toISO: string): number {
  const a = parseISODate(fromISO);
  const b = parseISODate(toISO);
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
}

export default function Oggi() {
  const { cloud } = useStore();
  const data = useData();
  const { group, members, categories, transactions, deadlines } = data;
  const me = members.find((m) => m.id === data.meId);
  const t = totals(transactions);
  const goal = group.goal;
  const upcoming = deadlines.filter((d) => !d.paid).slice(0, 3);
  const recent = transactions.slice(0, 5);
  const catById = new Map(categories.map((c) => [c.id, c]));
  const memById = new Map(members.map((m) => [m.id, m]));

  const goalProgress = goal ? Math.max(0, t.balance) / goal.amount : 0;
  const missing = goal ? Math.max(0, goal.amount - t.balance) : 0;
  const monthsLeft = goal?.date ? Math.max(1, monthsBetween(todayISO(), goal.date)) : null;

  const invite = async () => {
    const r = await shareInvite(group.name, group.inviteCode);
    if (r === 'copied') notify('Invito copiato', 'Incollalo in WhatsApp o dove preferisci.');
  };

  return (
    <Screen>
      <Text style={textStyles.secondary}>Ciao {me?.name ?? ''} 👋</Text>
      <Text style={styles.groupName}>{group.name}</Text>

      <Card style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Saldo complessivo</Text>
        <Text style={styles.balance}>{formatEuro(t.balance)}</Text>
        <View style={styles.split}>
          <View style={styles.splitItem}>
            <Text style={styles.splitLabel}>▲ Entrate</Text>
            <Text style={styles.splitValue}>{formatEuro(t.income)}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.splitItem}>
            <Text style={styles.splitLabel}>▼ Uscite</Text>
            <Text style={styles.splitValue}>{formatEuro(t.expense)}</Text>
          </View>
        </View>
      </Card>

      <Button label="Registra" icon="＋" onPress={() => router.push('/registra')} style={{ marginBottom: 12 }} />

      <SectionTitle>Traguardo</SectionTitle>
      {goal ? (
        <Card>
          <View style={styles.goalHead}>
            <Text style={textStyles.strong}>🎯 {goal.name}</Text>
            <Text style={textStyles.secondary}>{Math.min(100, Math.round(goalProgress * 100))}%</Text>
          </View>
          <ProgressBar progress={goalProgress} color={goalProgress >= 1 ? colors.good : colors.primary} />
          <Text style={[textStyles.secondary, { marginTop: 8 }]}>
            {formatEuro(Math.max(0, t.balance))} di {formatEuro(goal.amount)}
            {goal.date ? ` · entro il ${formatDate(goal.date)}` : ''}
          </Text>
          {missing > 0 ? (
            <Text style={[textStyles.muted, { marginTop: 4 }]}>
              Mancano {formatEuro(missing)}
              {monthsLeft ? ` · circa ${formatEuro(missing / monthsLeft)} al mese` : ''}
            </Text>
          ) : (
            <Text style={[textStyles.strong, { marginTop: 4, color: colors.good }]}>Traguardo raggiunto! 🎉</Text>
          )}
        </Card>
      ) : (
        <Pressable onPress={() => router.push('/impostazioni')}>
          <Card style={styles.dashed}>
            <Text style={textStyles.strong}>🎯 Fissa un obiettivo di risparmio</Text>
            <Text style={textStyles.secondary}>Es. "Natale" · 5.000 € entro dicembre</Text>
          </Card>
        </Pressable>
      )}

      <SectionTitle
        right={
          <Pressable onPress={() => router.push('/scadenze')}>
            <Text style={styles.link}>Vedi tutte</Text>
          </Pressable>
        }
      >
        Prossime scadenze
      </SectionTitle>
      <Card>
        {upcoming.length ? (
          upcoming.map((d) => <DeadlineRow key={d.id} d={d} onPress={() => router.push('/scadenze')} />)
        ) : (
          <Text style={textStyles.secondary}>Nessuna scadenza in arrivo.</Text>
        )}
        <Button
          label="Fotografa una bolletta"
          icon="📸"
          variant="secondary"
          onPress={() => router.push('/scadenza')}
          style={{ marginTop: 8 }}
        />
      </Card>

      {cloud && members.length < 2 && (
        <Card style={styles.inviteCard}>
          <Text style={[textStyles.strong, { color: '#fff' }]}>Gestite la casa insieme 👨‍👩‍👧</Text>
          <Text style={{ color: '#dfe5ff', marginVertical: 6 }}>
            Invita partner o coinquilini: vedrete gli stessi movimenti e scadenze in tempo reale.
          </Text>
          <Button label={`Invita · codice ${group.inviteCode}`} variant="secondary" onPress={invite} />
        </Card>
      )}

      <SectionTitle
        right={
          <Pressable onPress={() => router.push('/movimenti')}>
            <Text style={styles.link}>Vedi tutti</Text>
          </Pressable>
        }
      >
        Ultimi movimenti
      </SectionTitle>
      <Card>
        {recent.length ? (
          recent.map((tx) => (
            <TransactionRow key={tx.id} tx={tx} category={catById.get(tx.categoryId)} member={memById.get(tx.memberId)} />
          ))
        ) : (
          <Text style={textStyles.secondary}>
            Ancora nessun movimento. Tocca "Registra" per iniziare.
          </Text>
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  groupName: { fontSize: 26, fontWeight: '800', color: colors.text, marginBottom: 12 },
  balanceCard: { backgroundColor: colors.text, borderColor: colors.text },
  balanceLabel: { color: '#aab0c0', fontSize: 14 },
  balance: { color: '#fff', fontSize: 36, fontWeight: '800', marginVertical: 4, letterSpacing: -0.5 },
  split: { flexDirection: 'row', marginTop: 8 },
  splitItem: { flex: 1 },
  splitLabel: { color: '#aab0c0', fontSize: 13 },
  splitValue: { color: '#fff', fontSize: 17, fontWeight: '700', marginTop: 2 },
  divider: { width: 1, backgroundColor: '#343849', marginHorizontal: 12 },
  goalHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  dashed: { borderStyle: 'dashed', borderColor: colors.primary },
  inviteCard: { backgroundColor: colors.primary, borderColor: colors.primary, marginTop: 8 },
  link: { color: colors.primary, fontWeight: '600' },
});
