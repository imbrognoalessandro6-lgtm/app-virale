import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, FunctionsHttpError, type SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

import { config } from '../config';
import { toISODate } from '../format';
import type {
  Category,
  Deadline,
  DeadlineKind,
  Goal,
  Member,
  NewDeadline,
  NewTransaction,
  ScanResult,
  Snapshot,
  Transaction,
  TxType,
} from '../types';
import { ScanLimitError, type Backend } from './types';

interface GroupRow {
  id: string;
  name: string;
  invite_code: string;
  goal_name: string | null;
  goal_amount: number | string | null;
  goal_date: string | null;
  premium_until: string | null;
}

interface DeadlineRow {
  id: string;
  kind: DeadlineKind;
  title: string;
  amount: number | string | null;
  due_date: string;
  explanation: string;
  todo: string[];
  paid: boolean;
  created_at: string;
}

function toDeadline(r: DeadlineRow): Deadline {
  return {
    id: r.id,
    kind: r.kind,
    title: r.title,
    amount: r.amount === null ? null : Number(r.amount),
    dueDate: r.due_date,
    explanation: r.explanation,
    todo: r.todo ?? [],
    paid: r.paid,
    createdAt: r.created_at,
  };
}

/** Dati condivisi tra i membri della famiglia con Supabase (Postgres + Realtime). */
export class SupabaseBackend implements Backend {
  readonly cloud = true;
  private sb: SupabaseClient;
  private userId: string | null = null;
  private groupId: string | null = null;

  constructor() {
    this.sb = createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: Platform.OS === 'web',
      },
    });
  }

  async init() {
    // Account anonimo: nessuna registrazione, si entra subito. Si può collegare un'email in futuro.
    const { data } = await this.sb.auth.getSession();
    if (data.session) {
      this.userId = data.session.user.id;
    } else {
      const { data: anon, error } = await this.sb.auth.signInAnonymously();
      if (error) throw error;
      this.userId = anon.user!.id;
    }
    const { data: me } = await this.sb.from('members').select('group_id').eq('user_id', this.userId).maybeSingle();
    if (!me) return null;
    this.groupId = me.group_id as string;
    return this.refresh();
  }

  get currentUserId() {
    return this.userId;
  }

  async refresh(): Promise<Snapshot> {
    const gid = this.requireGroup();
    const monthStart = toISODate(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
    const [group, members, categories, transactions, deadlines, scans] = await Promise.all([
      this.sb.from('groups').select('*').eq('id', gid).single(),
      this.sb.from('members').select('id, user_id, name, color').eq('group_id', gid).order('created_at'),
      this.sb.from('categories').select('id, name, type, active').eq('group_id', gid).order('created_at'),
      this.sb
        .from('transactions')
        .select('id, type, amount, category_id, member_id, date, note, created_at')
        .eq('group_id', gid)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false }),
      this.sb.from('deadlines').select('*').eq('group_id', gid).order('due_date'),
      this.sb.from('scans').select('id', { count: 'exact', head: true }).eq('group_id', gid).gte('created_at', monthStart),
    ]);
    for (const r of [group, members, categories, transactions, deadlines]) if (r.error) throw r.error;

    const g = group.data as GroupRow;
    const goal: Goal | null =
      g.goal_name && g.goal_amount ? { name: g.goal_name, amount: Number(g.goal_amount), date: g.goal_date } : null;
    const memberRows = members.data as (Member & { user_id: string | null })[];
    const me = memberRows.find((m) => m.user_id === this.userId);

    return {
      group: {
        id: g.id,
        name: g.name,
        inviteCode: g.invite_code,
        goal,
        premium: Boolean(g.premium_until && new Date(g.premium_until) > new Date()),
      },
      meId: me?.id ?? '',
      members: memberRows.map(({ id, name, color }) => ({ id, name, color })),
      categories: categories.data as Category[],
      transactions: (transactions.data as Record<string, string>[]).map(
        (t): Transaction => ({
          id: t.id,
          type: t.type as TxType,
          amount: Number(t.amount),
          categoryId: t.category_id,
          memberId: t.member_id,
          date: t.date,
          note: t.note,
          createdAt: t.created_at,
        }),
      ),
      deadlines: (deadlines.data as DeadlineRow[]).map(toDeadline),
      scansThisMonth: scans.count ?? 0,
    };
  }

  async createGroup(groupName: string, memberName: string) {
    const { data, error } = await this.sb.rpc('create_group', { p_group_name: groupName, p_member_name: memberName });
    if (error) throw new Error(error.message);
    this.groupId = data as string;
    return this.refresh();
  }

  async joinGroup(inviteCode: string, memberName: string) {
    const { data, error } = await this.sb.rpc('join_group', { p_code: inviteCode, p_member_name: memberName });
    if (error) throw new Error(error.message);
    this.groupId = data as string;
    return this.refresh();
  }

  async leaveGroup() {
    const { error } = await this.sb.rpc('leave_group');
    if (error) throw new Error(error.message);
    this.groupId = null;
  }

  async addTransaction(tx: NewTransaction) {
    await this.check(
      this.sb.from('transactions').insert({
        group_id: this.requireGroup(),
        member_id: tx.memberId,
        category_id: tx.categoryId,
        type: tx.type,
        amount: tx.amount,
        date: tx.date,
        note: tx.note,
      }),
    );
  }

  async deleteTransaction(id: string) {
    await this.check(this.sb.from('transactions').delete().eq('id', id));
  }

  async addCategory(name: string, type: TxType) {
    await this.check(this.sb.from('categories').insert({ group_id: this.requireGroup(), name, type }));
  }

  async setCategoryActive(id: string, active: boolean) {
    await this.check(this.sb.from('categories').update({ active }).eq('id', id));
  }

  async setGoal(goal: Goal | null) {
    await this.check(
      this.sb
        .from('groups')
        .update({ goal_name: goal?.name ?? null, goal_amount: goal?.amount ?? null, goal_date: goal?.date ?? null })
        .eq('id', this.requireGroup()),
    );
  }

  async addMember(name: string) {
    const { count } = await this.sb.from('members').select('id', { count: 'exact', head: true }).eq('group_id', this.requireGroup());
    const palette = ['#2a78d6', '#eb6834', '#1baf7a', '#6250d6', '#e87ba4', '#eda100'];
    await this.check(
      this.sb.from('members').insert({ group_id: this.requireGroup(), name, color: palette[(count ?? 0) % palette.length] }),
    );
  }

  async addDeadline(d: NewDeadline) {
    const { data, error } = await this.sb
      .from('deadlines')
      .insert({
        group_id: this.requireGroup(),
        kind: d.kind,
        title: d.title,
        amount: d.amount,
        due_date: d.dueDate,
        explanation: d.explanation,
        todo: d.todo,
      })
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    return toDeadline(data as DeadlineRow);
  }

  async setDeadlinePaid(id: string, paid: boolean) {
    await this.check(this.sb.from('deadlines').update({ paid }).eq('id', id));
  }

  async deleteDeadline(id: string) {
    await this.check(this.sb.from('deadlines').delete().eq('id', id));
  }

  async scanDocument(base64Jpeg: string): Promise<ScanResult> {
    const { data, error } = await this.sb.functions.invoke('scan-document', { body: { image: base64Jpeg } });
    if (error) {
      if (error instanceof FunctionsHttpError) {
        const status = error.context.status;
        if (status === 402) throw new ScanLimitError();
        const body = await error.context.json().catch(() => null);
        throw new Error(body?.error ?? 'Non sono riuscito a leggere il documento.');
      }
      throw new Error('Connessione non riuscita. Riprova.');
    }
    return data as ScanResult;
  }

  subscribe(onChange: () => void) {
    const gid = this.groupId;
    if (!gid) return () => {};
    const filter = `group_id=eq.${gid}`;
    const channel = this.sb
      .channel(`group-${gid}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions', filter }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deadlines', filter }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories', filter }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'members', filter }, onChange)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'groups', filter: `id=eq.${gid}` }, onChange)
      .subscribe();
    return () => {
      this.sb.removeChannel(channel);
    };
  }

  private requireGroup(): string {
    if (!this.groupId) throw new Error('Nessuna famiglia configurata');
    return this.groupId;
  }

  private async check(query: PromiseLike<{ error: { message: string } | null }>) {
    const { error } = await query;
    if (error) throw new Error(error.message);
  }
}
