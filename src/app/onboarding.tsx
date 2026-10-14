import { Redirect } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';

import { Button, Card, Field, Screen, Segmented, textStyles } from '../components/ui';
import { errorMessage, notify } from '../lib/alert';
import { useStore } from '../lib/store';
import { colors } from '../lib/theme';

type Mode = 'crea' | 'entra';

export default function Onboarding() {
  const { data, cloud, createGroup, joinGroup } = useStore();
  const [mode, setMode] = useState<Mode>('crea');
  const [name, setName] = useState('');
  const [group, setGroup] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  if (data) return <Redirect href="/" />;

  const submit = async () => {
    if (!name.trim()) return notify('Come ti chiami?', 'Inserisci il tuo nome.');
    setBusy(true);
    try {
      if (mode === 'crea') await createGroup(group.trim() || 'Famiglia', name.trim());
      else {
        if (code.trim().length < 6) throw new Error('Il codice invito ha 6 caratteri.');
        await joinGroup(code.trim(), name.trim());
      }
    } catch (e) {
      notify('Ops', errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen>
        <View style={styles.hero}>
          <Text style={styles.logo}>🏡</Text>
          <Text style={styles.title}>Casa in Ordine</Text>
          <Text style={[textStyles.secondary, styles.subtitle]}>
            I soldi e le scadenze della famiglia, in un'unica app condivisa.
          </Text>
        </View>

        <Card>
          {[
            ['💶', 'Registra entrate e uscite insieme a chi vive con te'],
            ['📸', "Fotografa bollette e multe: l'IA legge importo e scadenza"],
            ['🔔', 'Ricevi un promemoria prima di ogni scadenza'],
            ['🎯', 'Fissate un obiettivo di risparmio comune'],
          ].map(([icon, text]) => (
            <View key={text} style={styles.feature}>
              <Text style={styles.featureIcon}>{icon}</Text>
              <Text style={[textStyles.body, { flex: 1 }]}>{text}</Text>
            </View>
          ))}
        </Card>

        {cloud && (
          <Segmented<Mode>
            options={[
              { value: 'crea', label: 'Crea una famiglia' },
              { value: 'entra', label: 'Ho un codice' },
            ]}
            value={mode}
            onChange={setMode}
          />
        )}

        <Field label="Il tuo nome" placeholder="Es. Giulia" value={name} onChangeText={setName} autoCapitalize="words" />
        {mode === 'crea' ? (
          <Field
            label="Nome del gruppo"
            placeholder="Es. Casa Rossi, Io e Marco…"
            value={group}
            onChangeText={setGroup}
            hint="Potrai invitare partner, coinquilini o familiari con un codice."
          />
        ) : (
          <Field
            label="Codice invito"
            placeholder="Es. K7M2QX"
            value={code}
            onChangeText={(t) => setCode(t.toUpperCase())}
            autoCapitalize="characters"
            maxLength={6}
            hint="Lo trovi nell'app di chi ti ha invitato, in Impostazioni."
          />
        )}
        <Button label={mode === 'crea' ? 'Inizia' : 'Entra nella famiglia'} onPress={submit} loading={busy} />
        {!cloud && (
          <Text style={[textStyles.muted, { marginTop: 16, textAlign: 'center' }]}>
            Modalità locale: i dati restano su questo telefono.
          </Text>
        )}
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', marginTop: 24, marginBottom: 20 },
  logo: { fontSize: 56 },
  title: { fontSize: 30, fontWeight: '800', color: colors.text, marginTop: 8 },
  subtitle: { textAlign: 'center', marginTop: 6, fontSize: 16, lineHeight: 22 },
  feature: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 },
  featureIcon: { fontSize: 22 },
});
