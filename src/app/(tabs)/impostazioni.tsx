import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';

import { Button, Card, Field, Label, Screen, SectionTitle, Segmented, textStyles } from '../../components/ui';
import { confirm, errorMessage, notify } from '../../lib/alert';
import { formatDate, formatEuro, parseAmount, parseItalianDate } from '../../lib/format';
import { shareInvite } from '../../lib/invite';
import { useData, useStore } from '../../lib/store';
import { colors } from '../../lib/theme';
import type { TxType } from '../../lib/types';

function GoalSection() {
  const { setGoal } = useStore();
  const { group } = useData();
  const goal = group.goal;
  const [name, setName] = useState(goal?.name ?? '');
  const [amount, setAmount] = useState(goal ? String(goal.amount).replace('.', ',') : '');
  const [date, setDate] = useState(goal?.date ? formatDate(goal.date) : '');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    const value = parseAmount(amount);
    const iso = date.trim() ? parseItalianDate(date) : null;
    if (!name.trim()) return notify('Dai un nome al traguardo', 'Es. "Natale" o "Vacanze"');
    if (!value) return notify('Importo non valido');
    if (date.trim() && !iso) return notify('Data non valida', 'Usa il formato GG/MM/AAAA');
    setBusy(true);
    try {
      await setGoal({ name: name.trim(), amount: value, date: iso });
      notify('Obiettivo salvato 🎯', `${name.trim()}: ${formatEuro(value)}`);
    } catch (e) {
      notify('Errore', errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!(await confirm('Rimuovere l\'obiettivo?', 'Potrai crearne uno nuovo quando vuoi.', 'Rimuovi', true))) return;
    await setGoal(null);
    setName('');
    setAmount('');
    setDate('');
  };

  return (
    <Card>
      <Text style={[textStyles.secondary, { marginBottom: 12 }]}>Condiviso da tutte le persone della famiglia.</Text>
      <Field label="Nome del traguardo" value={name} onChangeText={setName} placeholder="Es. Natale" />
      <Field label="Importo da raggiungere" value={amount} onChangeText={setAmount} placeholder="5.000" keyboardType="decimal-pad" />
      <Field label="Data desiderata" value={date} onChangeText={setDate} placeholder="GG/MM/AAAA (facoltativa)" />
      <Button label={goal ? 'Aggiorna obiettivo' : 'Salva obiettivo'} onPress={save} loading={busy} />
      {goal && <Button label="Rimuovi obiettivo" variant="danger" onPress={remove} style={{ marginTop: 8 }} />}
    </Card>
  );
}

function CategoriesSection() {
  const { addCategory, setCategoryActive } = useStore();
  const { categories } = useData();
  const [name, setName] = useState('');
  const [type, setType] = useState<TxType>('uscita');

  const add = async () => {
    const n = name.trim();
    if (!n) return notify('Scrivi il nome della categoria', 'Es. "Assicurazione"');
    if (categories.some((c) => c.type === type && c.name.toLowerCase() === n.toLowerCase())) {
      return notify('Esiste già', `La categoria "${n}" c'è già.`);
    }
    try {
      await addCategory(n, type);
      setName('');
    } catch (e) {
      notify('Errore', errorMessage(e));
    }
  };

  return (
    <Card>
      <Field label="Nuova categoria" value={name} onChangeText={setName} placeholder="Es. Assicurazione" />
      <Segmented<TxType>
        options={[
          { value: 'entrata', label: 'Entrata', color: colors.income },
          { value: 'uscita', label: 'Uscita', color: colors.expense },
        ]}
        value={type}
        onChange={setType}
      />
      <Button label="Aggiungi" icon="＋" onPress={add} />

      {(['uscita', 'entrata'] as TxType[]).map((t) => (
        <View key={t} style={{ marginTop: 16 }}>
          <Label>{t === 'uscita' ? 'Categorie di uscita' : 'Categorie di entrata'}</Label>
          {categories
            .filter((c) => c.type === t)
            .map((c) => (
              <View key={c.id} style={styles.switchRow}>
                <Text style={[textStyles.body, !c.active && { color: colors.textMuted }]}>{c.name}</Text>
                <Switch
                  value={c.active}
                  onValueChange={(v) => setCategoryActive(c.id, v).catch((e) => notify('Errore', errorMessage(e)))}
                  trackColor={{ true: colors.primary, false: colors.border }}
                  thumbColor="#ffffff"
                  accessibilityLabel={`Categoria ${c.name} ${c.active ? 'attiva' : 'disattivata'}`}
                />
              </View>
            ))}
        </View>
      ))}
      <Text style={[textStyles.muted, { marginTop: 8 }]}>Le categorie disattivate non compaiono quando registri, ma restano nello storico.</Text>
    </Card>
  );
}

function FamilySection() {
  const { cloud, addMember } = useStore();
  const { group, members, meId } = useData();
  const [name, setName] = useState('');

  const add = async () => {
    if (!name.trim()) return;
    try {
      await addMember(name.trim());
      setName('');
    } catch (e) {
      notify('Errore', errorMessage(e));
    }
  };

  const invite = async () => {
    const r = await shareInvite(group.name, group.inviteCode);
    if (r === 'copied') notify('Invito copiato', 'Incollalo in WhatsApp o dove preferisci.');
  };

  return (
    <Card>
      {members.map((m) => (
        <View key={m.id} style={styles.memberRow}>
          <View style={[styles.avatar, { backgroundColor: m.color }]}>
            <Text style={styles.avatarText}>{m.name.slice(0, 1).toUpperCase()}</Text>
          </View>
          <Text style={textStyles.body}>
            {m.name}
            {m.id === meId ? <Text style={textStyles.muted}> (tu)</Text> : null}
          </Text>
        </View>
      ))}
      {cloud && (
        <View style={styles.codeBox}>
          <Text style={textStyles.secondary}>Codice invito</Text>
          <Text style={styles.code}>{group.inviteCode}</Text>
          <Button label="Invita qualcuno" icon="📨" onPress={invite} />
        </View>
      )}
      <View style={{ marginTop: 16 }}>
        <Field
          label="Aggiungi un profilo senza account"
          value={name}
          onChangeText={setName}
          placeholder="Es. Luca (figlio)"
          hint="Utile per attribuire spese a chi non usa l'app."
        />
        <Button label="Aggiungi profilo" variant="secondary" onPress={add} />
      </View>
    </Card>
  );
}

export default function Impostazioni() {
  const { premium, cloud, leaveGroup } = useStore();
  const { group } = useData();

  const leave = async () => {
    const msg = cloud
      ? 'Non vedrai più i dati di questa famiglia su questo telefono. Gli altri membri li conservano.'
      : 'Tutti i dati salvati su questo telefono verranno cancellati.';
    if (!(await confirm(cloud ? 'Lasciare la famiglia?' : 'Cancellare tutti i dati?', msg, 'Conferma', true))) return;
    try {
      await leaveGroup();
      router.replace('/onboarding');
    } catch (e) {
      notify('Errore', errorMessage(e));
    }
  };

  return (
    <Screen title="Impostazioni">
      <SectionTitle>Abbonamento</SectionTitle>
      <Card>
        {premium ? (
          <Text style={textStyles.strong}>⭐ Premium attivo per tutta la famiglia</Text>
        ) : (
          <>
            <Text style={textStyles.strong}>Piano gratuito</Text>
            <Text style={[textStyles.secondary, { marginVertical: 6 }]}>
              Scansioni IA illimitate ed export CSV con Premium.
            </Text>
            <Button label="Scopri Premium" icon="⭐" onPress={() => router.push('/premium')} />
          </>
        )}
      </Card>

      <SectionTitle>Obiettivo di risparmio</SectionTitle>
      <GoalSection key={group.goal ? `${group.goal.name}-${group.goal.amount}` : 'nuovo'} />

      <SectionTitle>Categorie</SectionTitle>
      <CategoriesSection />

      <SectionTitle>Famiglia · {group.name}</SectionTitle>
      <FamilySection />

      <Button label={cloud ? 'Lascia la famiglia' : 'Cancella tutti i dati'} variant="danger" onPress={leave} style={{ marginTop: 12 }} />
      <Text style={[textStyles.muted, { textAlign: 'center', marginTop: 16 }]}>Casa in Ordine · v1.0</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 },
  avatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '800' },
  codeBox: { backgroundColor: colors.bg, borderRadius: 12, padding: 14, marginTop: 12, alignItems: 'center', gap: 6 },
  code: { fontSize: 28, fontWeight: '800', letterSpacing: 6, color: colors.text, marginBottom: 6 },
});
