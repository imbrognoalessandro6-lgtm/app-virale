export type TxType = 'entrata' | 'uscita';

export type DeadlineKind = 'bolletta' | 'auto' | 'documento' | 'fisco' | 'multa' | 'altro';

export interface Goal {
  name: string;
  amount: number;
  /** Data desiderata, formato ISO YYYY-MM-DD */
  date: string | null;
}

export interface Group {
  id: string;
  name: string;
  inviteCode: string;
  goal: Goal | null;
  premium: boolean;
}

export interface Member {
  id: string;
  name: string;
  color: string;
}

export interface Category {
  id: string;
  name: string;
  type: TxType;
  active: boolean;
}

export interface Transaction {
  id: string;
  type: TxType;
  amount: number;
  categoryId: string;
  memberId: string;
  /** ISO YYYY-MM-DD */
  date: string;
  note: string;
  createdAt: string;
}

export interface Deadline {
  id: string;
  kind: DeadlineKind;
  title: string;
  amount: number | null;
  /** ISO YYYY-MM-DD */
  dueDate: string;
  explanation: string;
  todo: string[];
  paid: boolean;
  createdAt: string;
}

export interface Snapshot {
  group: Group;
  meId: string;
  members: Member[];
  categories: Category[];
  transactions: Transaction[];
  deadlines: Deadline[];
  scansThisMonth: number;
}

export type NewTransaction = Omit<Transaction, 'id' | 'createdAt'>;
export type NewDeadline = Omit<Deadline, 'id' | 'createdAt' | 'paid'>;

/** Risultato della lettura IA di un documento. */
export interface ScanResult {
  kind: DeadlineKind;
  title: string;
  issuer: string;
  amount: number | null;
  dueDate: string | null;
  explanation: string;
  todo: string[];
  readable: boolean;
}

export const DEADLINE_KINDS: { kind: DeadlineKind; label: string; icon: string }[] = [
  { kind: 'bolletta', label: 'Bollette', icon: '💡' },
  { kind: 'auto', label: 'Auto', icon: '🚗' },
  { kind: 'documento', label: 'Documenti', icon: '🪪' },
  { kind: 'fisco', label: 'Fisco', icon: '🧾' },
  { kind: 'multa', label: 'Multe', icon: '🚨' },
  { kind: 'altro', label: 'Altro', icon: '📌' },
];

export const DEFAULT_CATEGORIES: { name: string; type: TxType }[] = [
  { name: 'Stipendio', type: 'entrata' },
  { name: 'Extra', type: 'entrata' },
  { name: 'Spesa', type: 'uscita' },
  { name: 'Casa', type: 'uscita' },
  { name: 'Bollette', type: 'uscita' },
  { name: 'Auto', type: 'uscita' },
  { name: 'Salute', type: 'uscita' },
  { name: 'Svago', type: 'uscita' },
  { name: 'Figli', type: 'uscita' },
];

export const MEMBER_COLORS = ['#2a78d6', '#eb6834', '#1baf7a', '#6250d6', '#e87ba4', '#eda100'];
