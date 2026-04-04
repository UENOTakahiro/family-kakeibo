import type { Timestamp } from 'firebase/firestore';

export interface Transaction {
  id: string;
  date: string;          // "YYYY-MM-DD"
  amount: number;
  category: string;
  member: string;
  description: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface TransactionInput {
  date: string;
  amount: number;
  category: string;
  member: string;
  description: string;
}

export interface Budget {
  total: number;
  byCategory: Record<string, number>;
}

export interface Settings {
  categories: string[];
  members: string[];
}

export interface User {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string | null;
}
