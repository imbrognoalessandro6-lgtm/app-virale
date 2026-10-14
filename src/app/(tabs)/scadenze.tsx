import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { DeadlineRow } from '../../components/rows';
import { Button, Card, Empty, Screen, SectionTitle, textStyles } from '../../components/ui';
import { confirm, errorMessage, notify } from '../../lib/alert';
import { daysUntil } from '../../lib/format';
import { useData, useStore } from '../../lib/store';
import { colors } from '../../lib/theme';
import { DEADLINE_KINDS, type Deadline } from '../../lib/types';

const CATEGORY_FOR_KIND: Record<Deadline['kind'], string> = {
  bolletta: 'Bollette',
  auto: 'Auto',
  documento: 'Casa',
  fisco: 'Casa',
  multa: 'Auto',
  altro: 'Casa',
};

function DeadlineCard({ d }: { d: Deadline }) {
  const { setDeadlinePaid, deleteDeadline } = useStore();
  const [open, setOpen] = useState(false);

  const markPaid = async () => {
    try {
      await setDeadlinePaid(d.id, true);
      if (d.amount && (await confirm('Pagata! ✅', `Vuoi registrare anche l'uscita di ${d.amount.toFixed(2).replace('.', ',')} € in cassa?`, 'Registra'))) {
        router.push({
          pathname: '/registra',
          params: { tipo: 'uscita', importo: d.amount.toFixed(2), categoria: CATEGORY_FOR_KIND[d.kind], nota: d.title },
        });
      }
    } catch (e) {
      notify('Errore', errorMessage(e));
    }
  };

  const remove = async () => {
    if (await confirm('Eliminare la scadenza?', d.title, 'Elimina', true)) {
      deleteDeadline(d.id).catch((e) => notify('Errore', errorMessage(e)));
    }
  };

  return (
    <Card>
      <DeadlineRow d={d} onPress={() => setOpen((o) => !o)} />
      {open && (
        <View style={styles.details}>
          {d.explanation ? (
            <>
              <Text style={styles.detailTitle}>Cosa dice</Text>
              <Text style={textStyles.body}>{d.explanation}</Text>
            </>
          ) : null}
          {d.todo.length > 0 && (
            <>
              <Text style={styles.detailTitle}>Cosa fare</Text>
              {d.todo.map((step, i) => (
                <Text key={i} style={[textStyles.body, { marginBottom: 2 }]}>
                  {i + 1}. {step}
                </Text>
              ))}
            </>
          )}
          <View style={styles.actions}>
            {d.paid ? (
              <Button label="Segna da pagare" variant="ghost" onPress={() => setDeadlinePaid(d.id, false)} style={{ flex: 1 }} />
            ) : (
              <Button label="Segna pagata" icon="✓" onPress={markPaid} style={{ flex: 1 }} />
            )}
            <Button label="Elimina" variant="danger" onPress={remove} />
          </View>
        </View>
      )}
    </Card>
  );
}

export default function Scadenze() {
  const { scansLeft, premium } = useStore();
  const { deadlines } = useData();
  const [showPaid, setShowPaid] = useState(false);

  const open = deadlines.filter((d) => !d.paid);
  const overdue = open.filter((d) => daysUntil(d.dueDate) < 0);
  const upcoming = open.filter((d) => daysUntil(d.dueDate) >= 0);
  const paid = deadlines.filter((d) => d.paid).reverse();
  const toPay = open.reduce((s, d) => s + (d.amount ?? 0), 0);

  return (
    <Screen title="Scadenze">
      <Card style={styles.scanCard}>
        <Text style={styles.scanTitle}>📸 Fotografa e dimentica</Text>
        <Text style={styles.scanText}>
          Bollette, multe, bollo, F24, lettere dell'Agenzia delle Entrate: l'IA legge importo e scadenza, ti spiega cosa
          significa e ti avvisa in tempo.
        </Text>
        <Button label="Scansiona un documento" variant="secondary" onPress={() => router.push('/scadenza')} />
        {!premium && (
          <Text style={styles.scanQuota}>
            {scansLeft > 0 ? `${scansLeft} scansioni gratuite rimaste questo mese` : 'Scansioni gratuite esaurite · passa a Premium'}
          </Text>
        )}
      </Card>

      {open.length > 0 && (
        <Text style={[textStyles.secondary, { marginBottom: 4 }]}>
          Da pagare: <Text style={textStyles.strong}>{toPay.toFixed(2).replace('.', ',')} €</Text> in {open.length}{' '}
          {open.length === 1 ? 'scadenza' : 'scadenze'}
        </Text>
      )}

      {overdue.length > 0 && (
        <>
          <SectionTitle>⚠️ Scadute</SectionTitle>
          {overdue.map((d) => (
            <DeadlineCard key={d.id} d={d} />
          ))}
        </>
      )}

      <SectionTitle>In arrivo</SectionTitle>
      {upcoming.length ? (
        upcoming.map((d) => <DeadlineCard key={d.id} d={d} />)
      ) : (
        <Card>
          <Empty icon="🗓️" text="Nessuna scadenza in arrivo. Aggiungi la prossima bolletta o il bollo dell'auto." />
          <View style={styles.kinds}>
            {DEADLINE_KINDS.map((k) => (
              <Text key={k.kind} style={textStyles.muted}>
                {k.icon} {k.label}
              </Text>
            ))}
          </View>
        </Card>
      )}

      {paid.length > 0 && (
        <>
          <SectionTitle>Pagate ({paid.length})</SectionTitle>
          {showPaid ? (
            paid.map((d) => <DeadlineCard key={d.id} d={d} />)
          ) : (
            <Button label="Mostra pagate" variant="ghost" onPress={() => setShowPaid(true)} />
          )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  scanCard: { backgroundColor: colors.primary, borderColor: colors.primary },
  scanTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  scanText: { color: '#dfe5ff', marginVertical: 8, lineHeight: 20 },
  scanQuota: { color: '#dfe5ff', fontSize: 12, textAlign: 'center', marginTop: 8 },
  details: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10, marginTop: 4 },
  detailTitle: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', marginTop: 8, marginBottom: 4 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  kinds: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12 },
});
