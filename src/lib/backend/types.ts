import type { Deadline, Goal, NewDeadline, NewTransaction, ScanResult, Snapshot, TxType } from '../types';

/**
 * Strato dati dell'app. Due implementazioni:
 * - LocalBackend: tutto sul dispositivo (AsyncStorage), nessun account.
 * - SupabaseBackend: dati condivisi in tempo reale tra i membri della famiglia.
 */
export interface Backend {
  readonly cloud: boolean;
  /** Ritorna i dati se l'utente ha già un gruppo, altrimenti null (serve l'onboarding). */
  init(): Promise<Snapshot | null>;
  refresh(): Promise<Snapshot>;
  createGroup(groupName: string, memberName: string): Promise<Snapshot>;
  joinGroup(inviteCode: string, memberName: string): Promise<Snapshot>;
  leaveGroup(): Promise<void>;

  addTransaction(tx: NewTransaction): Promise<void>;
  deleteTransaction(id: string): Promise<void>;

  addCategory(name: string, type: TxType): Promise<void>;
  setCategoryActive(id: string, active: boolean): Promise<void>;

  setGoal(goal: Goal | null): Promise<void>;
  /** Aggiunge un profilo senza account (es. un figlio). */
  addMember(name: string): Promise<void>;

  addDeadline(d: NewDeadline): Promise<Deadline>;
  setDeadlinePaid(id: string, paid: boolean): Promise<void>;
  deleteDeadline(id: string): Promise<void>;

  /** Legge una foto (JPEG base64) con l'IA. Lancia ScanLimitError se la quota gratuita è finita. */
  scanDocument(base64Jpeg: string): Promise<ScanResult>;

  /** Notifica quando un altro membro modifica i dati. Ritorna la funzione per annullare. */
  subscribe(onChange: () => void): () => void;
}

export class ScanLimitError extends Error {
  constructor() {
    super('Hai esaurito le scansioni gratuite di questo mese.');
  }
}
