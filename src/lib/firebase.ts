import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import type {
  FirestoreDataConverter,
  QueryDocumentSnapshot,
  SnapshotOptions,
  WithFieldValue,
} from 'firebase/firestore';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut as fbSignOut } from 'firebase/auth';
import type { Transaction, TransactionInput, Settings, Budget, Deposit, DepositInput } from '../types';

const transactionConverter: FirestoreDataConverter<Transaction> = {
  toFirestore(t: WithFieldValue<Transaction>) {
    const { id: _id, ...data } = t as Transaction;
    return data;
  },
  fromFirestore(snapshot: QueryDocumentSnapshot, options: SnapshotOptions): Transaction {
    const d = snapshot.data(options);
    return {
      id: snapshot.id,
      date: d.date,
      amount: d.amount,
      category: d.category,
      member: d.member,
      description: d.description,
      settlementTarget: d.settlementTarget ?? true,
      createdAt: d.createdAt ?? null,
      updatedAt: d.updatedAt ?? null,
    };
  },
};

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
export const auth = getAuth(app);

// ---- 認証 ----

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  await signInWithPopup(auth, provider);
}

export async function signOut() {
  await fbSignOut(auth);
}

// ---- 取引 ----

export async function addTransaction(input: TransactionInput): Promise<string> {
  const ref = await addDoc(collection(db, 'transactions'), {
    ...input,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateTransaction(
  id: string,
  input: Partial<TransactionInput>,
): Promise<void> {
  await updateDoc(doc(db, 'transactions', id), {
    ...input,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteTransaction(id: string): Promise<void> {
  await deleteDoc(doc(db, 'transactions', id));
}

export function subscribeTransactions(
  onData: (transactions: Transaction[]) => void,
) {
  const q = query(
    collection(db, 'transactions').withConverter(transactionConverter),
    orderBy('date', 'desc'),
  );
  return onSnapshot(q, snapshot => {
    onData(snapshot.docs.map(d => d.data()));
  });
}

// ---- 設定 ----

const DEFAULT_SETTINGS: Settings = {
  categories: ['食費', '交通費', '日用品', '娯楽', '医療', '外食', 'その他'],
  members: ['メンバー1', 'メンバー2'],
};

export function subscribeSettings(onData: (settings: Settings) => void) {
  return onSnapshot(doc(db, 'settings', 'main'), snapshot => {
    if (snapshot.exists()) {
      onData(snapshot.data() as Settings);
    } else {
      setDoc(doc(db, 'settings', 'main'), DEFAULT_SETTINGS);
      onData(DEFAULT_SETTINGS);
    }
  });
}

export async function updateSettings(settings: Partial<Settings>): Promise<void> {
  await setDoc(doc(db, 'settings', 'main'), settings, { merge: true });
}

// ---- 予算 ----

export function subscribeBudget(
  yearMonth: string,
  onData: (budget: Budget | null) => void,
) {
  return onSnapshot(doc(db, 'budgets', yearMonth), snapshot => {
    onData(snapshot.exists() ? (snapshot.data() as Budget) : null);
  });
}

export async function setBudget(yearMonth: string, budget: Budget): Promise<void> {
  await setDoc(doc(db, 'budgets', yearMonth), budget);
}

// ---- 入金 ----

const depositConverter: FirestoreDataConverter<Deposit> = {
  toFirestore(d: WithFieldValue<Deposit>) {
    const { id: _id, ...data } = d as Deposit;
    return data;
  },
  fromFirestore(snapshot: QueryDocumentSnapshot, options: SnapshotOptions): Deposit {
    const d = snapshot.data(options);
    return {
      id: snapshot.id,
      date: d.date,
      amount: d.amount,
      member: d.member,
      note: d.note ?? '',
      createdAt: d.createdAt ?? null,
      updatedAt: d.updatedAt ?? null,
    };
  },
};

export async function addDeposit(input: DepositInput): Promise<string> {
  const ref = await addDoc(collection(db, 'deposits'), {
    ...input,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateDeposit(
  id: string,
  input: Partial<DepositInput>,
): Promise<void> {
  await updateDoc(doc(db, 'deposits', id), {
    ...input,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteDeposit(id: string): Promise<void> {
  await deleteDoc(doc(db, 'deposits', id));
}

export function subscribeDeposits(onData: (deposits: Deposit[]) => void) {
  const q = query(
    collection(db, 'deposits').withConverter(depositConverter),
    orderBy('date', 'desc'),
  );
  return onSnapshot(q, snapshot => {
    onData(snapshot.docs.map(d => d.data()));
  });
}
