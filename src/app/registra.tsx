import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button, Chip, ChipRow, Field, Label, Screen, Segmented } from '../components/ui';
import { errorMessage, notify } from '../lib/alert';
import { addDays, formatDate, parseAmount, parseItalianDate, todayISO } from '../lib/format';
import { useData, useStore } from '../lib/store';
import { colors } from '../lib/theme';
import type { TxType } from '../lib/types';

/**
 * Modulo "Registra movimento". Parametri opzionali per precompilare
 * (es. dopo aver segnato una bolletta come pagata): tipo, importo, categoria, nota.
 */
export default function Registra() {
  const params = useLocalSearchParams<{ tipo?: TxType; importo?: string; categoria?: string; nota?: string }>();
  const { addTransaction } = useStore();
  const { categories, members, meId } = useData();

  const [type, setType] = useState<TxType>(params.tipo ?? 'uscita');
  const [amount, setAmount] = useState(params.importo ? params.importo.replace('.', ',') : '');
  const activeCats = useMemo(() => categories.filter((c) => c.active && c.type === type), [categories, type]);
  const [categoryId, setCategoryId] = useState<string | null>(
    () => categories.find((c) => c.active && c.name.toLowerCase() === params.categoria?.toLowerCase())?.id ?? null,
  );
  const [memberId, setMemberId] = useState(meId || members[0]?.id);
  const [date, setDate] = useState(formatDate(todayISO()));
  const [note, setNote] = useState(params.nota ?? '');
  const [busy, setBusy] = useState(false);

  const selectedCategory = activeCats.some((c) => c.id === categoryId) ? categoryId : null;

  const save = async () => {
    const value = parseAmount(amount);
    const iso = parseItalianDate(date);
    if (!value) return notify('Importo non valido', 'Scrivi un importo, es. 25,90');
    if (!selectedCategory) return notify('Scegli una categoria');
    if (!iso) return notify('Data non valida', 'Usa il formato GG/MM/AAAA');
    setBusy(true);
    try {
      await addTransaction({ type, amount: value, categoryId: selectedCategory, memberId, date: iso, note: note.trim() });
      router.back();
    } catch (e) {
      notify('Non salvato', errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const typeColor = type === 'entrata' ? colors.income : colors.expense;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen
        title="Registra"
        right={
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Text style={styles.close}>Chiudi</Text>
          </Pressable>
        }
      >
        <Segmented<TxType>
          options={[
            { value: 'entrata', label: '▲ Entrata', color: colors.income },
            { value: 'uscita', label: '▼ Uscita', color: colors.expense },
          ]}
          value={type}
          onChange={setType}
        />

        <Label>Importo</Label>
        <View style={[styles.amountBox, { borderColor: typeColor }]}>
          <Text style={[styles.currency, { color: typeColor }]}>€</Text>
          <TextInput
            value={amount}
            onChangeText={setAmount}
            placeholder="0,00"
            placeholderTextColor={colors.textMuted}
            keyboardType="decimal-pad"
            style={styles.amountInput}
            autoFocus={!params.importo}
            accessibilityLabel="Importo in euro"
          />
        </View>

        <Label>Categoria</Label>
        <ChipRow>
          {activeCats.map((c) => (
            <Chip key={c.id} label={c.name} selected={c.id === selectedCategory} onPress={() => setCategoryId(c.id)} />
          ))}
          <Chip label="＋ Nuova" onPress={() => router.push('/impostazioni')} />
        </ChipRow>

        <Label>Chi l'ha registrata</Label>
        <ChipRow>
          {members.map((m) => (
            <Chip key={m.id} label={m.name} color={m.color} selected={m.id === memberId} onPress={() => setMemberId(m.id)} />
          ))}
        </ChipRow>

        <Field
          label="Data"
          value={date}
          onChangeText={setDate}
          placeholder="GG/MM/AAAA"
          keyboardType="numbers-and-punctuation"
        />
        <View style={[styles.quick]}>
          <Chip label="Oggi" onPress={() => setDate(formatDate(todayISO()))} selected={date === formatDate(todayISO())} />
          <Chip
            label="Ieri"
            onPress={() => setDate(formatDate(addDays(todayISO(), -1)))}
            selected={date === formatDate(addDays(todayISO(), -1))}
          />
        </View>

        <Field label="Note" value={note} onChangeText={setNote} placeholder="Facoltative" maxLength={140} />

        <Button label="Registra movimento" onPress={save} loading={busy} />
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  close: { color: colors.primary, fontSize: 16, fontWeight: '600' },
  amountBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 2, borderRadius: 14, paddingLeft: 14, marginBottom: 16, backgroundColor: colors.card },
  currency: { fontSize: 26, fontWeight: '800' },
  amountInput: { flex: 1, fontSize: 28, fontWeight: '800', color: colors.text, paddingVertical: 12, paddingHorizontal: 10 },
  quick: { flexDirection: 'row', gap: 8, marginTop: -8, marginBottom: 16 },
});
