import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, Card, Screen, textStyles } from '../components/ui';
import { errorMessage, notify } from '../lib/alert';
import { buy, loadPlans, purchasesAvailable, restore, type Plan } from '../lib/purchases';
import { useStore } from '../lib/store';
import { colors } from '../lib/theme';

const BENEFITS = [
  ['📸', 'Scansioni IA illimitate', 'Bollette, multe, F24, lettere: letti e spiegati in pochi secondi'],
  ['⬇️', 'Export CSV', 'Tutti i movimenti in Excel, filtrati come vuoi'],
  ['👨‍👩‍👧', 'Un abbonamento per tutta la famiglia', 'Chi è nel gruppo ha Premium senza pagare di nuovo'],
  ['💚', "Sostieni un'app italiana indipendente", 'Niente pubblicità, niente vendita dei tuoi dati'],
];

export default function Premium() {
  const { premium, setLocalPremium, reload } = useStore();
  const available = purchasesAvailable();
  const [plans, setPlans] = useState<Plan[] | null>(available ? null : []);
  const [selected, setSelected] = useState<string>('annual');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!available) return;
    loadPlans()
      .then(setPlans)
      .catch(() => setPlans([]));
  }, [available]);

  const purchase = async () => {
    const plan = plans?.find((p) => p.id === selected);
    if (!plan) return;
    setBusy(true);
    try {
      if (await buy(plan)) {
        setLocalPremium(true);
        reload().catch(() => {});
        notify('Benvenuto in Premium ⭐', 'Grazie! Ora tutta la famiglia ha le funzioni Premium.');
        router.back();
      }
    } catch (e) {
      notify('Acquisto non riuscito', errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const doRestore = async () => {
    setBusy(true);
    try {
      const ok = await restore();
      setLocalPremium(ok);
      notify(ok ? 'Acquisti ripristinati ⭐' : 'Nessun abbonamento trovato');
      if (ok) router.back();
    } catch (e) {
      notify('Errore', errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen
      right={
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.close}>Chiudi</Text>
        </Pressable>
      }
      title=" "
    >
      <View style={styles.hero}>
        <Text style={{ fontSize: 52 }}>⭐</Text>
        <Text style={styles.title}>Casa in Ordine Premium</Text>
        <Text style={[textStyles.secondary, { textAlign: 'center' }]}>Una mora evitata ripaga un anno di abbonamento.</Text>
      </View>

      <Card>
        {BENEFITS.map(([icon, title, text]) => (
          <View key={title} style={styles.benefit}>
            <Text style={{ fontSize: 22 }}>{icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={textStyles.strong}>{title}</Text>
              <Text style={textStyles.secondary}>{text}</Text>
            </View>
          </View>
        ))}
      </Card>

      {premium ? (
        <Text style={[textStyles.strong, { textAlign: 'center', color: colors.good }]}>Premium è già attivo ✓</Text>
      ) : plans === null ? (
        <ActivityIndicator color={colors.primary} />
      ) : plans.length === 0 ? (
        <Card>
          <Text style={textStyles.secondary}>
            Gli abbonamenti si attivano dall'app installata da App Store o Google Play.
          </Text>
        </Card>
      ) : (
        <>
          {plans.map((p) => (
            <Pressable
              key={p.id}
              onPress={() => setSelected(p.id)}
              style={[styles.plan, selected === p.id && styles.planSelected]}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected === p.id }}
            >
              <View>
                <Text style={textStyles.strong}>{p.title}</Text>
                {p.period === 'annuale' && <Text style={styles.save}>7 giorni gratis · il più conveniente</Text>}
              </View>
              <Text style={textStyles.strong}>
                {p.price}/{p.period === 'annuale' ? 'anno' : 'mese'}
              </Text>
            </Pressable>
          ))}
          <Button label="Continua" onPress={purchase} loading={busy} style={{ marginTop: 8 }} />
          <Text style={[textStyles.muted, { textAlign: 'center', marginTop: 8 }]}>
            Rinnovo automatico, disdici quando vuoi dalle impostazioni dello store.
          </Text>
        </>
      )}

      {available && !premium && <Button label="Ripristina acquisti" variant="ghost" onPress={doRestore} style={{ marginTop: 12 }} />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  close: { color: colors.primary, fontSize: 16, fontWeight: '600' },
  hero: { alignItems: 'center', marginBottom: 16, gap: 6 },
  title: { fontSize: 24, fontWeight: '800', color: colors.text },
  benefit: { flexDirection: 'row', gap: 12, paddingVertical: 8, alignItems: 'flex-start' },
  plan: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.card,
    marginBottom: 8,
  },
  planSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  save: { fontSize: 12, color: colors.good, fontWeight: '600', marginTop: 2 },
});
