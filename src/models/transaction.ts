export type Transaction = {
    id: string;
    userId?: string;
    amount: number;  // Amount in user's default currency
    originalAmount?: number;  // Original amount in original currency
    type: 'income' | 'expense';
    category: string;
    subcategory?: string;
    timestamp: Date;
    note?: string;
    currency?: string;  // User's default currency
    originalCurrency?: string;  // Original transaction currency
    tags?: string[];
    location?: string;
    emoji?: string;
    createdAt: string;
    updatedAt: string;
};

export type EditableTransaction = Omit<Transaction, 'id' | 'userId' | 'createdAt' | 'updatedAt'>;