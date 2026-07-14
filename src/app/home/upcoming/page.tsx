'use client';

import { useEffect, useState } from 'react';
import {
  CalendarClock,
  Check,
  Trash2,
  Plus,
  ArrowLeft,
  TrendingDown,
  TrendingUp,
  CircleDollarSign,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import Head from '@/components/Head';
import Setting from '@/components/Setting';
import FloatingMenu from '@/components/FloatingMenu';
import FormattedNumber from '@/components/FormattedNumber';
import EditForm from '@/components/EditForm';
import { useUserStore } from '@/store/useUserStore';
import { useUpcomingStore } from '@/store/useUpcomingStore';
import { CURRENCIES } from '@/config/constants';
import { EditableTransaction } from '@/models/transaction';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
  DrawerClose,
} from '@/components/ui/drawer';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useRouter } from 'next/navigation';

export default function UpcomingPage() {
  const { user, queryUser } = useUserStore();
  const {
    upcomingTransactions,
    upcoming_loading,
    queryUpcoming,
    addUpcoming,
    deleteUpcoming,
    approveUpcoming,
  } = useUpcomingStore();

  const router = useRouter();
  const [isSettingOpen, setIsSettingOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmApproveId, setConfirmApproveId] = useState<string | null>(null);

  // Form state for new upcoming transaction
  const [form, setForm] = useState<EditableTransaction>({
    amount: 0,
    originalAmount: 0,
    currency: user?.currency || 'USD',
    originalCurrency: user?.currency || 'USD',
    type: 'expense',
    category: 'Other',
    timestamp: new Date(),
    note: '',
    tags: [],
    location: '',
    emoji: '💰',
    account: 'inhand',
  });

  useEffect(() => {
    queryUser();
    queryUpcoming();
  }, []);

  const resetForm = () => {
    setForm({
      amount: 0,
      originalAmount: 0,
      currency: user?.currency || 'USD',
      originalCurrency: user?.currency || 'USD',
      type: 'expense',
      category: 'Other',
      timestamp: new Date(),
      note: '',
      tags: [],
      location: '',
      emoji: '💰',
      account: 'inhand',
    });
  };

  const handleAddUpcoming = async () => {
    if (!form.originalAmount || form.originalAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    await addUpcoming({
      amount: form.amount,
      originalAmount: form.originalAmount,
      type: form.type,
      category: form.category,
      expectedDate: form.timestamp,
      note: form.note,
      currency: form.currency,
      originalCurrency: form.originalCurrency,
      tags: form.tags,
      location: form.location,
      emoji: form.emoji,
      account: form.account,
    });
    resetForm();
    setIsAddOpen(false);
  };

  const handleApprove = async (id: string) => {
    setApprovingId(id);
    setConfirmApproveId(null);
    await approveUpcoming(id);
    setApprovingId(null);
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    await deleteUpcoming(id);
    setDeletingId(null);
  };

  if (!user) {
    return (
      <main className="relative flex items-start justify-center min-h-screen bg-[#F8F8F7]">
        <div className="w-full max-w-md pb-28">
          <div className="flex items-center justify-between py-2 px-4 w-full bg-white">
            <Skeleton className="h-14 w-14 rounded-full bg-gray-200 ml-2" />
            <div className="flex-1 flex flex-col ml-3">
              <Skeleton className="h-5 w-32 mb-1 rounded bg-gray-200" />
              <Skeleton className="h-4 w-24 rounded bg-gray-200" />
            </div>
          </div>
          <div className="p-4 space-y-4">
            <Skeleton className="h-32 w-full rounded bg-gray-200" />
            <Skeleton className="h-40 w-full rounded bg-gray-200" />
          </div>
        </div>
      </main>
    );
  }

  const currencySymbol = CURRENCIES.find(c => c.code === user.currency)?.symbol || '$';

  // Calculate totals from upcoming
  const totalUpcomingExpense = upcomingTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
  const totalUpcomingIncome = upcomingTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  const expectedImpact = totalUpcomingIncome - totalUpcomingExpense;

  return (
    <main className="relative flex items-start justify-center min-h-screen bg-[#F8F8F7]">
      <div className="w-full max-w-md pb-28">
        <Head onMenuClick={() => setIsSettingOpen(true)} />

        {/* Page Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <div className="flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-orange-600" />
            <h1 className="text-lg font-bold text-gray-800">Upcoming</h1>
          </div>
          <button
            onClick={() => { setIsAddOpen(true); resetForm(); }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-full text-xs font-semibold shadow-md shadow-orange-500/20 hover:shadow-lg hover:shadow-orange-500/30 active:scale-95 transition-all duration-200 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Plan New
          </button>
        </div>

        {/* Summary Card */}
        <div className="bg-white p-5 mx-4 my-2 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-500 text-sm font-medium">Expected Impact</span>
            <span className="text-[11px] bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
              <CalendarClock className="w-3 h-3" />
              {upcomingTransactions.length} planned
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-3">
            <div className="flex items-start gap-2">
              <div className="p-1.5 bg-red-50 text-red-500 rounded-lg">
                <TrendingDown className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] text-gray-400 block font-medium uppercase tracking-wider">Planned Expenses</span>
                <span className="text-sm font-bold text-red-600">
                  -{currencySymbol}<FormattedNumber value={totalUpcomingExpense.toFixed(2)} />
                </span>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="p-1.5 bg-green-50 text-green-500 rounded-lg">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] text-gray-400 block font-medium uppercase tracking-wider">Planned Income</span>
                <span className="text-sm font-bold text-green-600">
                  +{currencySymbol}<FormattedNumber value={totalUpcomingIncome.toFixed(2)} />
                </span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-100 rounded-xl p-3">
            <div className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider mb-0.5">Expected Balance After All</div>
            <div className="text-xl font-bold text-orange-800">
              {currencySymbol}<FormattedNumber value={(user.stats.expectedBalance ?? user.stats.balance).toFixed(2)} />
            </div>
            <div className="text-[11px] text-gray-500 mt-0.5">
              Current: {currencySymbol}<FormattedNumber value={user.stats.balance.toFixed(2)} />
              <span className={`ml-2 font-semibold ${expectedImpact >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                ({expectedImpact >= 0 ? '+' : ''}{currencySymbol}{expectedImpact.toFixed(2)})
              </span>
            </div>
          </div>
        </div>

        {/* Upcoming Transactions List */}
        <div className="mx-4 my-3">
          {upcoming_loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-20 w-full rounded-2xl bg-gray-200" />
              ))}
            </div>
          ) : upcomingTransactions.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
              <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <CalendarClock className="w-8 h-8 text-orange-400" />
              </div>
              <h3 className="text-base font-semibold text-gray-700 mb-1">No Planned Transactions</h3>
              <p className="text-sm text-gray-400 mb-4">
                Plan your upcoming expenses and income to track your expected balance.
              </p>
              <button
                onClick={() => { setIsAddOpen(true); resetForm(); }}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-full text-sm font-semibold shadow-md hover:shadow-lg active:scale-95 transition-all duration-200 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Add First Plan
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {upcomingTransactions.map(tx => (
                <div
                  key={tx.id}
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 transition-all duration-200 hover:shadow-md"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="text-2xl flex-shrink-0 mt-0.5">{tx.emoji || '💰'}</div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-semibold text-gray-800 truncate">{tx.category}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                            tx.type === 'expense'
                              ? 'bg-red-50 text-red-600'
                              : 'bg-green-50 text-green-600'
                          }`}>
                            {tx.type}
                          </span>
                        </div>
                        {tx.note && (
                          <p className="text-xs text-gray-500 truncate max-w-[200px]">{tx.note}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-gray-400 flex items-center gap-1">
                            <CalendarClock className="w-3 h-3" />
                            {new Date(tx.expectedDate).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </span>
                          {tx.account && (
                            <span className="text-[10px] text-gray-400">
                              {tx.account === 'inhand' ? '💵' : '💳'} {tx.account === 'inhand' ? 'Cash' : 'Account'}
                            </span>
                          )}
                        </div>
                        {tx.tags && tx.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {tx.tags.map(tag => (
                              <span key={tag} className="text-[9px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded-full">{tag}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0 ml-3">
                      <span className={`text-sm font-bold ${tx.type === 'expense' ? 'text-red-500' : 'text-green-600'}`}>
                        {tx.type === 'expense' ? '-' : '+'}{currencySymbol}{tx.amount.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-50">
                    <button
                      onClick={() => setConfirmApproveId(tx.id)}
                      disabled={approvingId === tx.id}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-green-50 text-green-700 hover:bg-green-100 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer active:scale-95 disabled:opacity-50"
                    >
                      {approvingId === tx.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Check className="w-3.5 h-3.5" />
                      )}
                      Approve
                    </button>
                    <button
                      onClick={() => handleDelete(tx.id)}
                      disabled={deletingId === tx.id}
                      className="flex items-center justify-center gap-1.5 py-2 px-3 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer active:scale-95 disabled:opacity-50"
                    >
                      {deletingId === tx.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Approve Confirmation Dialog */}
        <Dialog open={!!confirmApproveId} onOpenChange={(open) => { if (!open) setConfirmApproveId(null); }}>
          <DialogContent className="max-w-[340px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <Check className="w-5 h-5 text-green-600" />
                Approve Transaction?
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm text-gray-600">
              This will add the transaction to your actual records with today&apos;s date. Your balance will be updated immediately.
            </p>
            <DialogFooter className="mt-2">
              <Button
                variant="outline"
                onClick={() => setConfirmApproveId(null)}
                className="cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                onClick={() => confirmApproveId && handleApprove(confirmApproveId)}
                className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white cursor-pointer"
              >
                Approve & Add
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Upcoming Transaction Drawer */}
        <Drawer open={isAddOpen} onOpenChange={setIsAddOpen} repositionInputs={false}>
          <DrawerContent className="p-6 w-full px-2">
            <DrawerHeader className="pt-0">
              <DrawerTitle className="flex justify-center gap-2">
                <CalendarClock className="w-5 h-5 text-orange-500" />
                Plan Upcoming Transaction
              </DrawerTitle>
            </DrawerHeader>

            <EditForm formData={form} onFormChange={setForm} />

            <DrawerFooter>
              <div className="flex justify-between">
                <DrawerClose asChild>
                  <Button variant="outline" className="w-[49%] h-10" onClick={resetForm}>Cancel</Button>
                </DrawerClose>
                <DrawerClose asChild>
                  <Button
                    className="w-[49%] h-10 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white"
                    onClick={handleAddUpcoming}
                  >
                    Add Plan
                  </Button>
                </DrawerClose>
              </div>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>

        {/* Settings */}
        {user && (
          <Setting
            open={isSettingOpen}
            onOpenChange={(open) => {
              setIsSettingOpen(open);
              if (!open) {
                queryUser();
                queryUpcoming();
              }
            }}
            user={user}
          />
        )}
      </div>

      {/* Floating Pill Menu */}
      <FloatingMenu onAddClick={() => { setIsAddOpen(true); resetForm(); }} />
    </main>
  );
}
