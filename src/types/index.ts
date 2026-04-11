import type { Timestamp } from 'firebase/firestore';

export interface Deposit {
  id: string;
  date: string;       // "YYYY-MM-DD"
  amount: number;
  member: string;
  note: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface DepositInput {
  date: string;
  amount: number;
  member: string;
  note: string;
}

export interface Transaction {
  id: string;
  date: string;          // "YYYY-MM-DD"
  amount: number;
  category: string;
  member: string;
  description: string;
  settlementTarget: boolean; // 精算対象かどうか（デフォルト: true）
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface TransactionInput {
  date: string;
  amount: number;
  category: string;
  member: string;
  description: string;
  settlementTarget: boolean;
}

export interface Budget {
  total: number;
  byCategory: Record<string, number>;
}

export interface Settings {
  categories: string[];
  members: string[];
  monthlyDepositTarget?: number;
}

export interface User {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string | null;
}
