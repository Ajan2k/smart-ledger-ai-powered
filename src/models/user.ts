export type Language = 'en' | 'zh';

export interface IUserTag {
  id: string;
  name: string;
  color?: string;
  description?: string;
}

export type Location = {
  id: string;
  name: string;
  color?: string;
  description?: string;
};

export type Tag = {
  id: string;
  name: string;
  color?: string;
  description?: string;
};

export type Category = {
  id: string;
  name: string;
  type: 'income' | 'expense';
  color?: string;
  description?: string;
};

export type User = {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  avatar: string;
  language: Language;
  currency: string;
  locations: Location[];
  tags: Tag[];
  categories: Category[];
  stats: {
    totalIncome: number;
    totalExpense: number;
    balance: number;
    inHandBalance?: number;
    accountBalance?: number;
    totalTransactions: number;
    monthlyBalances?: { month: string; balance: number }[];
  };
  createdAt: string;
  updatedAt: string;
  apiToken?: string;
  sessionDuration?: number;
};

export type EditableUser = Omit<User, 'id' | 'role' | 'createdAt' | 'updatedAt'>;
