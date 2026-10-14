import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, Card, Chip, ChipRow, Field, Label, Screen, textStyles } from '../components/ui';
import { errorMessage, notify } from '../lib/alert';
import { ScanLimitError } from '../lib/backend/types';
import { formatDate, parseAmount, parseItalianDate } from '../lib/format';
import { ensureNotificationPermission } from '../lib/notifications';
import { useStore } from '../lib/store';
import { colors } from '../lib/theme';
import { DEADLINE_KINDS, type DeadlineKind } from '../lib/types';

type Step = 'scegli' | 'lettura' | 'modulo';

export default function NuovaScadenza() {
  const { addDeadline, scanDocument, scansLeft, premium, cloud } = useStore();
  const [step, setStep] = useState<Step>('scegli');
  const [kind, setKind] = useState<DeadlineKind>('bolletta');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [due, setDue] = useState('');
  const [explanation, setExplanation] = useState('');
  const [todo, setTodo] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const scan = async (source: 'camera' | 'galleria') => {
    if (!premium && scansLeft <= 0) return router.push('/premium');
    const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], base64: true, quality: 0.6 };
    let result: ImagePicker.ImagePickerResult;
    if (source === 'camera') {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) return notify('Serve la fotocamera', 'Concedi il permesso nelle impostazioni del telefono.');
      result = await ImagePicker.launchCameraAsync(options);
    } else {
      result = await ImagePicker.launchImageLibraryAsync(options);
    }
    const asset = result.canceled ? null : result.assets[0];
    if (!asset?.base64) return;

    setStep('lettura');
    try {
      const r = await scanDocument(asset.base64);
      if (!r.readable) {
        notify('Foto poco leggibile', 'Prova con più luce e inquadrando tutto il foglio. Intanto puoi completare a mano.');
      }
      setKind(r.kind);
      setTitle(r.issuer && !r.title.includes(r.issuer) ? `${r.title} · ${r.issuer}` : r.title);
      setAmount(r.amount ? r.amount.toFixed(2).replace('.', ',') : '');
      setDue(r.dueDate ? formatDate(r.dueDate) : '');
      setExplanation(r.explanation);
      setTodo(r.todo);
      setStep('modulo');
    } catch (e) {
      if (e instanceof ScanLimitError) {
        setStep('scegli');
        return router.push('/premium');
      }
      notify('Lettura non riuscita', errorMessage(e));
      setStep('modulo');
    }
  };

  const save = async () => {
    const iso = parseItalianDate(due);
    if (!title.trim()) return notify('Dai un nome alla scadenza', 'Es. "Bolletta luce Enel"');
    if (!iso) return notify('Data non valida', 'Usa il formato GG/MM/AAAA');
    const value = amount.trim() ? parseAmount(amount) : null;
    if (amount.trim() && !value) return notify('Importo non valido');
    setBusy(true);
    try {
      await ensureNotificationPermission();
      await addDeadline({ kind, title: title.trim(), amount: value, dueDate: iso, explanation, todo });
      router.back();
    } catch (e) {
      notify('Non salvata', errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen
        title="Nuova scadenza"
        right={
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Text style={styles.close}>Chiudi</Text>
          </Pressable>
        }
      >
        {step === 'scegli' && (
          <>
            <Card>
              <Text style={textStyles.strong}>📸 Lascia fare all'IA</Text>
              <Text style={[textStyles.secondary, { marginVertical: 8 }]}>
                Fotografa bolletta, multa, avviso o lettera: leggo importo e scadenza e ti spiego cosa fare.
              </Text>
              {cloud ? (
                <>
                  <Button label="Scatta una foto" icon="📷" onPress={() => scan('camera')} />
                  <Button label="Scegli dalla galleria" icon="🖼️" variant="secondary" onPress={() => scan('galleria')} style={{ marginTop: 8 }} />
                  {!premium && (
                    <Text style={[textStyles.muted, { textAlign: 'center', marginTop: 8 }]}>
                      {scansLeft > 0 ? `${scansLeft} scansioni gratuite rimaste questo mese` : 'Scansioni gratuite esaurite'}
                    </Text>
                  )}
                </>
              ) : (
                <Text style={textStyles.muted}>Disponibile con la versione cloud.</Text>
              )}
            </Card>
            <Button label="Inserisci a mano" variant="ghost" onPress={() => setStep('modulo')} />
          </>
        )}

        {step === 'lettura' && (
          <View style={styles.reading}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[textStyles.secondary, { marginTop: 12 }]}>Sto leggendo il documento…</Text>
          </View>
        )}

        {step === 'modulo' && (
          <>
            {explanation ? (
              <Card style={styles.aiCard}>
                <Text style={styles.aiTitle}>✨ Cosa dice</Text>
                <Text style={textStyles.body}>{explanation}</Text>
                {todo.length > 0 && (
                  <>
                    <Text style={[styles.aiTitle, { marginTop: 10 }]}>Cosa fare</Text>
                    {todo.map((s, i) => (
                      <Text key={i} style={textStyles.body}>
                        {i + 1}. {s}
                      </Text>
                    ))}
                  </>
                )}
                <Text style={[textStyles.muted, { marginTop: 10 }]}>
                  Controlla i dati qui sotto: l'IA può sbagliare. Non sostituisce il parere di un professionista.
                </Text>
              </Card>
            ) : null}

            <Label>Tipo</Label>
            <ChipRow>
              {DEADLINE_KINDS.map((k) => (
                <Chip key={k.kind} label={`${k.icon} ${k.label}`} selected={kind === k.kind} onPress={() => setKind(k.kind)} />
              ))}
            </ChipRow>
            <Field label="Descrizione" value={title} onChangeText={setTitle} placeholder="Es. Bolletta gas, Bollo Panda, Rinnovo carta d'identità" />
            <Field label="Importo (facoltativo)" value={amount} onChangeText={setAmount} placeholder="0,00" keyboardType="decimal-pad" />
            <Field
              label="Scadenza"
              value={due}
              onChangeText={setDue}
              placeholder="GG/MM/AAAA"
              keyboardType="numbers-and-punctuation"
              hint="Ti avviso 3 giorni prima e il giorno stesso."
            />
            <Button label="Salva scadenza" onPress={save} loading={busy} />
          </>
        )}
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  close: { color: colors.primary, fontSize: 16, fontWeight: '600' },
  reading: { alignItems: 'center', paddingVertical: 80 },
  aiCard: { backgroundColor: colors.primarySoft, borderColor: colors.primarySoft },
  aiTitle: { fontSize: 13, fontWeight: '800', color: colors.primary, marginBottom: 4 },
});
