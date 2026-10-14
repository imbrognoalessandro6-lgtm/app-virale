import AsyncStorage from '@react-native-async-storage/async-storage';

import { randomId } from '../format';
import {
  DEFAULT_CATEGORIES,
  MEMBER_COLORS,
  type Deadline,
  type Goal,
  type NewDeadline,
  type NewTransaction,
  type ScanResult,
  type Snapshot,
  type TxType,
} from '../types';
import type { Backend } from './types';

const KEY = 'famiglia:snapshot:v1';

/** Tutti i dati restano sul telefono. Usato quando Supabase non è configurato. */
export class LocalBackend implements Backend {
  readonly cloud = false;
  private data: Snapshot | null = null;

  async init() {
    const raw = await AsyncStorage.getItem(KEY);
    this.data = raw ? (JSON.parse(raw) as Snapshot) : null;
    return this.data ? this.snapshot() : null;
  }

  async refresh() {
    return this.snapshot();
  }

  async createGroup(groupName: string, memberName: string) {
    const me = { id: randomId(), name: memberName, color: MEMBER_COLORS[0] };
    this.data = {
      group: { id: randomId(), name: groupName, inviteCode: '', goal: null, premium: false },
      meId: me.id,
      members: [me],
      categories: DEFAULT_CATEGORIES.map((c) => ({ id: randomId(), ...c, active: true })),
      transactions: [],
      deadlines: [],
      scansThisMonth: 0,
    };
    await this.save();
    return this.snapshot();
  }

  async joinGroup(): Promise<Snapshot> {
    throw new Error('Per entrare in una famiglia esistente serve la versione cloud.');
  }

  async leaveGroup() {
    this.data = null;
    await AsyncStorage.removeItem(KEY);
  }

  async addTransaction(tx: NewTransaction) {
    const d = this.require();
    d.transactions.unshift({ ...tx, id: randomId(), createdAt: new Date().toISOString() });
    await this.save();
  }

  async deleteTransaction(id: string) {
    const d = this.require();
    d.transactions = d.transactions.filter((t) => t.id !== id);
    await this.save();
  }

  async addCategory(name: string, type: TxType) {
    this.require().categories.push({ id: randomId(), name, type, active: true });
    await this.save();
  }

  async setCategoryActive(id: string, active: boolean) {
    const c = this.require().categories.find((x) => x.id === id);
    if (c) c.active = active;
    await this.save();
  }

  async setGoal(goal: Goal | null) {
    this.require().group.goal = goal;
    await this.save();
  }

  async addMember(name: string) {
    const d = this.require();
    d.members.push({ id: randomId(), name, color: MEMBER_COLORS[d.members.length % MEMBER_COLORS.length] });
    await this.save();
  }

  async addDeadline(input: NewDeadline) {
    const deadline: Deadline = { ...input, id: randomId(), paid: false, createdAt: new Date().toISOString() };
    this.require().deadlines.push(deadline);
    await this.save();
    return deadline;
  }

  async setDeadlinePaid(id: string, paid: boolean) {
    const dl = this.require().deadlines.find((x) => x.id === id);
    if (dl) dl.paid = paid;
    await this.save();
  }

  async deleteDeadline(id: string) {
    const d = this.require();
    d.deadlines = d.deadlines.filter((x) => x.id !== id);
    await this.save();
  }

  async scanDocument(): Promise<ScanResult> {
    throw new Error(
      'La lettura con IA richiede la versione cloud (Supabase). Puoi comunque inserire la scadenza a mano.',
    );
  }

  subscribe() {
    return () => {};
  }

  private require(): Snapshot {
    if (!this.data) throw new Error('Nessuna famiglia configurata');
    return this.data;
  }

  private snapshot(): Snapshot {
    const d = this.require();
    // Copia profonda: lo store React deve ricevere sempre oggetti nuovi.
    return JSON.parse(JSON.stringify(d));
  }

  private async save() {
    await AsyncStorage.setItem(KEY, JSON.stringify(this.data));
  }
}
