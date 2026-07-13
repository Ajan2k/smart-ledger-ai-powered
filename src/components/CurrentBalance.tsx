'use client';
import { useState } from 'react';
import FormattedNumber from '@/components/FormattedNumber';
import { cn } from '@/lib/utils';
import { Skeleton } from "@/components/ui/skeleton"
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { useUserStore } from '@/store/useUserStore';
import { CURRENCIES } from '@/config/constants';
import { ArrowRightLeft, ArrowDown, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function CurrentBalance() {
  const { user, user_loading, queryUser } = useUserStore();
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [transferAmount, setTransferAmount] = useState('');
  const [transferDirection, setTransferDirection] = useState<'account_to_inhand' | 'inhand_to_account'>('account_to_inhand');
  const [transferNote, setTransferNote] = useState('');
  const [transferLoading, setTransferLoading] = useState(false);

  if (!user) {
    return (
      <div className="bg-white p-6">
        <div className="space-y-2">
          <Skeleton className="h-5 w-32 mb-2 rounded bg-gray-200" />
          <Skeleton className="h-10 w-40 mb-1 rounded bg-gray-200" />
          <Skeleton className="h-4 w-24 rounded bg-gray-100" />
        </div>
        <div className="mt-6 h-23 w-full">
          <Skeleton className="h-full w-full rounded bg-gray-100" />
        </div>
      </div>
    );
  }

  const currencySymbol = CURRENCIES.find(c => c.code === user.currency)?.symbol || '$';

  // Fetch the balance data for the last 8 months
  const chartData = user.stats.monthlyBalances || [];
  // Month-over-month growth rate
  const last = chartData[chartData.length - 1]?.balance || 0;
  const prev = chartData[chartData.length - 2]?.balance || 0;
  const growth = prev === 0 ? 0 : ((last - prev) / Math.abs(prev)) * 100;

  const inHandBalance = user.stats.inHandBalance || 0;
  const accountBalance = user.stats.accountBalance || 0;

  const handleTransfer = async () => {
    const amt = parseFloat(transferAmount);
    if (!amt || amt <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    // Check if source has enough balance
    const sourceBalance = transferDirection === 'account_to_inhand' ? accountBalance : inHandBalance;
    const sourceLabel = transferDirection === 'account_to_inhand' ? 'Account' : 'In Hand';
    if (amt > sourceBalance) {
      toast.error(`Insufficient ${sourceLabel} balance (${currencySymbol}${sourceBalance.toFixed(2)})`);
      return;
    }

    setTransferLoading(true);
    try {
      const res = await fetch('/api/app/transactions/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amt,
          direction: transferDirection,
          note: transferNote || undefined,
        }),
      });

      if (res.ok) {
        const dirLabel = transferDirection === 'account_to_inhand'
          ? 'Account → In Hand'
          : 'In Hand → Account';
        toast.success(`${currencySymbol}${amt.toFixed(2)} transferred (${dirLabel})`);
        setIsTransferOpen(false);
        setTransferAmount('');
        setTransferNote('');
        // Refresh user stats to update the split balances
        queryUser();
      } else {
        const json = await res.json();
        toast.error(json.message || 'Transfer failed');
      }
    } catch {
      toast.error('Transfer failed. Please try again.');
    } finally {
      setTransferLoading(false);
    }
  };

  return (
    <div className="bg-white p-6">
      <div className="space-y-1">
        <div className="text-gray-700 text-base font-medium">Total Balance</div>
        <div className="flex items-end gap-2">
          <span className="text-3xl font-bold text-black">{currencySymbol}<FormattedNumber value={last.toFixed(2)} /></span>
        </div>
        <div className="text-sm text-gray-500">
          {growth >= 0 ? '+' : ''}{growth.toFixed(1)}% from last month
        </div>
      </div>

      {/* Account Balance split with Transfer button */}
      <div className="grid grid-cols-[1fr_auto_1fr] gap-2 mt-5 pt-4 border-t border-gray-100 items-center">
        {/* In Hand Card */}
        <div className="space-y-1 bg-amber-50/60 border border-amber-100/60 p-3 rounded-2xl flex flex-col justify-center">
          <div className="text-gray-500 text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1.5 select-none">
            <span>💵</span> In Hand
          </div>
          <div className="text-lg font-bold text-amber-800">
            {currencySymbol}<FormattedNumber value={inHandBalance.toFixed(2)} />
          </div>
        </div>

        {/* Transfer Button (center) */}
        <button
          onClick={() => setIsTransferOpen(true)}
          className="group flex items-center justify-center w-9 h-9 rounded-full bg-gray-100 hover:bg-indigo-100 border border-gray-200 hover:border-indigo-300 text-gray-400 hover:text-indigo-600 transition-all duration-200 cursor-pointer active:scale-90"
          aria-label="Transfer between wallets"
          title="Transfer money"
        >
          <ArrowRightLeft className="w-4 h-4 transition-transform duration-200 group-hover:rotate-180" />
        </button>

        {/* In Account Card */}
        <div className="space-y-1 bg-purple-50/60 border border-purple-100/60 p-3 rounded-2xl flex flex-col justify-center">
          <div className="text-gray-500 text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1.5 select-none">
            <span>💳</span> In Account
          </div>
          <div className="text-lg font-bold text-purple-800">
            {currencySymbol}<FormattedNumber value={accountBalance.toFixed(2)} />
          </div>
        </div>
      </div>

      {/* Transfer Dialog */}
      <Dialog open={isTransferOpen} onOpenChange={setIsTransferOpen}>
        <DialogContent className="max-w-[360px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-indigo-600" />
              Transfer Money
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Direction Selector */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Direction</Label>
              <div className="grid grid-cols-1 gap-2">
                <button
                  type="button"
                  onClick={() => setTransferDirection('account_to_inhand')}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-xl border-2 transition-all duration-200 cursor-pointer text-left",
                    transferDirection === 'account_to_inhand'
                      ? "border-indigo-400 bg-indigo-50/80 shadow-sm"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  )}
                >
                  <div className="flex items-center gap-2 flex-1 text-sm font-medium">
                    <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-[10px] font-semibold">💳 Account</span>
                    <ArrowDown className="w-3.5 h-3.5 text-gray-400 rotate-[-90deg]" />
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-[10px] font-semibold">💵 In Hand</span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setTransferDirection('inhand_to_account')}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-xl border-2 transition-all duration-200 cursor-pointer text-left",
                    transferDirection === 'inhand_to_account'
                      ? "border-indigo-400 bg-indigo-50/80 shadow-sm"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  )}
                >
                  <div className="flex items-center gap-2 flex-1 text-sm font-medium">
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-[10px] font-semibold">💵 In Hand</span>
                    <ArrowDown className="w-3.5 h-3.5 text-gray-400 rotate-[-90deg]" />
                    <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-[10px] font-semibold">💳 Account</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-sm">{currencySymbol}</span>
                <Input
                  type="number"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  placeholder="0.00"
                  className="pl-8 h-12 text-lg font-semibold"
                  min="0"
                  step="0.01"
                  autoFocus
                />
              </div>
              <p className="text-[11px] text-gray-400">
                Available: {currencySymbol}
                {transferDirection === 'account_to_inhand'
                  ? accountBalance.toFixed(2)
                  : inHandBalance.toFixed(2)
                }
              </p>
            </div>

            {/* Optional Note */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Note (optional)</Label>
              <Input
                type="text"
                value={transferNote}
                onChange={(e) => setTransferNote(e.target.value)}
                placeholder="e.g. Withdrew cash from ATM"
                className="h-10"
              />
            </div>
          </div>

          <DialogFooter className="mt-2">
            <Button
              variant="outline"
              onClick={() => setIsTransferOpen(false)}
              disabled={transferLoading}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              onClick={handleTransfer}
              disabled={transferLoading || !transferAmount}
              className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white cursor-pointer"
            >
              {transferLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                'Transfer'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="mt-4 w-full h-[80%]">
        <ResponsiveContainer width="100%" height={100}>
          <LineChart data={chartData} margin={{ left: 15, right: 15, top: 5, bottom: 0 }}>
            <XAxis
              dataKey="month"
              hide={false}
              tick={{ fontSize: 12, fill: "#888" }}
              tickLine={true}
              axisLine={true}
              tickFormatter={m => {
                // m: "2024-05"
                const monthNum = Number(m.split('-')[1]);
                const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                // console.log("month", monthNum, months[monthNum - 1]);
                return months[monthNum - 1];
                // return '1234';
              }}
            />
            <YAxis hide domain={['auto', 'auto']} />
            <Tooltip formatter={(value: number) => `${currencySymbol}${value.toFixed(2)}`} labelFormatter={() => ''} />
            <Line type="monotone" dataKey="balance" stroke="#111" strokeWidth={2} dot={{ r: 4, fill: '#fff', stroke: '#111', strokeWidth: 2 }} activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}