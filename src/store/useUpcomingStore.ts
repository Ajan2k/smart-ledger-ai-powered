import { create } from 'zustand';
import { UpcomingTransaction, EditableUpcoming } from '@/models/upcoming';
import { toast } from 'sonner';
import { useUserStore } from './useUserStore';
import { useTransactionStore } from './useTransactionStore';

interface UpcomingState {
    upcomingTransactions: UpcomingTransaction[];
    upcoming_loading: boolean;
    queryUpcoming: () => Promise<void>;
    addUpcoming: (data: EditableUpcoming) => Promise<void>;
    deleteUpcoming: (id: string) => Promise<void>;
    approveUpcoming: (id: string) => Promise<void>;
}

export const useUpcomingStore = create<UpcomingState>((set, get) => ({
    upcomingTransactions: [],
    upcoming_loading: false,

    queryUpcoming: async () => {
        set({ upcoming_loading: true });
        try {
            const res = await fetch('/api/app/upcoming-transactions');
            if (!res.ok) throw new Error('Network response was not ok');
            const json = await res.json();

            const items: UpcomingTransaction[] = (json.data || []).map((item: any) => ({
                ...item,
                expectedDate: new Date(item.expectedDate),
            }));

            set({ upcomingTransactions: items, upcoming_loading: false });
        } catch (error) {
            console.error('Error fetching upcoming transactions:', error);
            toast.error('Failed to fetch upcoming transactions');
            set({ upcoming_loading: false });
        }
    },

    addUpcoming: async (data: EditableUpcoming) => {
        try {
            const payload = {
                amount: data.amount,
                originalAmount: data.originalAmount,
                type: data.type,
                category: data.category,
                expectedDate: data.expectedDate,
                note: data.note,
                currency: data.currency,
                originalCurrency: data.originalCurrency,
                tags: data.tags,
                location: data.location,
                emoji: data.emoji,
                account: data.account || 'inhand',
            };
            const res = await fetch('/api/app/upcoming-transactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json = await res.json();
            if (json.transaction) {
                await get().queryUpcoming();
                toast.success('Upcoming transaction added');
                useUserStore.getState().queryUser();
            }
        } catch (err) {
            console.error('Failed to add upcoming transaction', err);
            toast.error('Failed to add upcoming transaction');
        }
    },

    deleteUpcoming: async (id: string) => {
        try {
            const res = await fetch(`/api/app/upcoming-transactions/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Delete failed');
            set(state => ({
                upcomingTransactions: state.upcomingTransactions.filter(tx => tx.id !== id)
            }));
            toast.success('Upcoming transaction deleted');
            useUserStore.getState().queryUser();
        } catch (err) {
            console.error('Error deleting upcoming transaction:', err);
            toast.error('Failed to delete upcoming transaction');
        }
    },

    approveUpcoming: async (id: string) => {
        try {
            const res = await fetch(`/api/app/upcoming-transactions/${id}/approve`, {
                method: 'POST',
            });
            if (!res.ok) throw new Error('Approve failed');
            
            // Remove from upcoming list
            set(state => ({
                upcomingTransactions: state.upcomingTransactions.filter(tx => tx.id !== id)
            }));
            
            toast.success('Transaction approved and added to your records!');
            
            // Refresh both stores
            useUserStore.getState().queryUser();
            useTransactionStore.getState().queryTransactions(1);
        } catch (err) {
            console.error('Error approving upcoming transaction:', err);
            toast.error('Failed to approve transaction');
        }
    },
}));
