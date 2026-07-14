export type UpcomingTransaction = {
    id: string;
    userId?: string;
    amount: number;
    originalAmount?: number;
    type: 'income' | 'expense';
    category: string;
    expectedDate: Date;
    note?: string;
    currency?: string;
    originalCurrency?: string;
    tags?: string[];
    location?: string;
    emoji?: string;
    account?: 'inhand' | 'account';
    status: 'pending' | 'approved' | 'cancelled';
    createdAt: string;
    updatedAt: string;
};

export type EditableUpcoming = Omit<UpcomingTransaction, 'id' | 'userId' | 'status' | 'createdAt' | 'updatedAt'>;
