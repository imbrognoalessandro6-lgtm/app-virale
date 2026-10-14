import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { LocalBackend } from './backend/local';
import { SupabaseBackend } from './backend/supabase';
import type { Backend } from './backend/types';
import { config, isCloud } from './config';
import { syncReminders } from './notifications';
import { hasActiveEntitlement, initPurchases } from './purchases';
import type { Goal, NewDeadline, NewTransaction, ScanResult, Snapshot, TxType } from './types';

interface StoreValue {
  ready: boolean;
  error: string | null;
  cloud: boolean;
  data: Snapshot | null;
  /** Premium attivo per la famiglia (abbonamento di un qualunque membro). */
  premium: boolean;
  scansLeft: number;
  reload(): Promise<void>;
  createGroup(groupName: string, memberName: string): Promise<void>;
  joinGroup(code: string, memberName: string): Promise<void>;
  leaveGroup(): Promise<void>;
  addTransaction(tx: NewTransaction): Promise<void>;
  deleteTransaction(id: string): Promise<void>;
  addCategory(name: string, type: TxType): Promise<void>;
  setCategoryActive(id: string, active: boolean): Promise<void>;
  setGoal(goal: Goal | null): Promise<void>;
  addMember(name: string): Promise<void>;
  addDeadline(d: NewDeadline): Promise<void>;
  setDeadlinePaid(id: string, paid: boolean): Promise<void>;
  deleteDeadline(id: string): Promise<void>;
  scanDocument(base64Jpeg: string): Promise<ScanResult>;
  setLocalPremium(active: boolean): void;
}

const StoreContext = createContext<StoreValue | null>(null);

function createBackend(): Backend {
  return isCloud ? new SupabaseBackend() : new LocalBackend();
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [b] = useState<Backend>(createBackend);

  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Snapshot | null>(null);
  const [localPremium, setLocalPremium] = useState(false);

  const apply = useCallback((snap: Snapshot | null) => {
    setData(snap);
    if (snap) syncReminders(snap.deadlines).catch(() => {});
  }, []);

  const reload = useCallback(async () => {
    apply(await b.refresh());
  }, [b, apply]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const snap = await b.init();
        if (cancelled) return;
        apply(snap);
        initPurchases(b instanceof SupabaseBackend ? b.currentUserId : null);
        setLocalPremium(await hasActiveEntitlement());
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [b, apply]);

  // Aggiornamenti in tempo reale dagli altri membri della famiglia.
  const groupId = data?.group.id;
  useEffect(() => {
    if (!groupId) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = b.subscribe(() => {
      clearTimeout(timer);
      timer = setTimeout(() => reload().catch(() => {}), 300);
    });
    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, [b, groupId, reload]);

  const value = useMemo<StoreValue>(() => {
    // Esegue una modifica e poi ricarica i dati.
    const mutate =
      <A extends unknown[]>(fn: (...args: A) => Promise<unknown>) =>
      async (...args: A) => {
        await fn(...args);
        await reload();
      };
    const premium = Boolean(data?.group.premium) || localPremium;
    return {
      ready,
      error,
      cloud: b.cloud,
      data,
      premium,
      scansLeft: premium ? Infinity : Math.max(0, config.freeScansPerMonth - (data?.scansThisMonth ?? 0)),
      reload,
      createGroup: async (g, m) => apply(await b.createGroup(g, m)),
      joinGroup: async (c, m) => apply(await b.joinGroup(c, m)),
      leaveGroup: async () => {
        await b.leaveGroup();
        apply(null);
      },
      addTransaction: mutate((tx: NewTransaction) => b.addTransaction(tx)),
      deleteTransaction: mutate((id: string) => b.deleteTransaction(id)),
      addCategory: mutate((name: string, type: TxType) => b.addCategory(name, type)),
      setCategoryActive: mutate((id: string, active: boolean) => b.setCategoryActive(id, active)),
      setGoal: mutate((goal: Goal | null) => b.setGoal(goal)),
      addMember: mutate((name: string) => b.addMember(name)),
      addDeadline: mutate((d: NewDeadline) => b.addDeadline(d)),
      setDeadlinePaid: mutate((id: string, paid: boolean) => b.setDeadlinePaid(id, paid)),
      deleteDeadline: mutate((id: string) => b.deleteDeadline(id)),
      scanDocument: async (img: string) => {
        const result = await b.scanDocument(img);
        reload().catch(() => {});
        return result;
      },
      setLocalPremium,
    };
  }, [ready, error, data, localPremium, b, reload, apply]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const v = useContext(StoreContext);
  if (!v) throw new Error('useStore fuori da StoreProvider');
  return v;
}

/** Per le schermate dentro le tab: i dati ci sono sempre (l'onboarding è già fatto). */
export function useData(): Snapshot {
  const { data } = useStore();
  if (!data) throw new Error('Dati non disponibili');
  return data;
}
