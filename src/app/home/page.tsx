'use client';

import { useEffect, useState } from "react";
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  Wallet, 
  MapPin, 
  Tag as TagIcon, 
  LayoutDashboard, 
  Plus, 
  RefreshCw, 
  Filter, 
  Calendar as CalendarIcon,
  ArrowRightLeft,
  ArrowDown,
  Loader2,
  CalendarClock
} from 'lucide-react';
import { toast } from "sonner";
import Head from "@/components/Head";
import Setting from "@/components/Setting";
import PopupEdit from "@/components/PopupEdit";
import FloatingMenu from "@/components/FloatingMenu";
import FormattedNumber from '@/components/FormattedNumber';
import { useUserStore } from '@/store/useUserStore';
import { CURRENCIES, INITIAL_CATEGORIES } from '@/config/constants';
import { Transaction } from "@/models/transaction";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip,
  LineChart,
  Line,
  XAxis,
  YAxis
} from 'recharts';
import { useRouter } from 'next/navigation';

const COLORS = [
  "#3b82f6", // Blue
  "#ef4444", // Red
  "#10b981", // Green
  "#f59e0b", // Amber
  "#8b5cf6", // Violet
  "#ec4899", // Pink
  "#14b8a6", // Teal
  "#f97316", // Orange
  "#6366f1", // Indigo
  "#a855f7", // Purple
];

interface BreakdownItem {
  name: string;
  amount: number;
  emoji?: string;
  percentage: number;
  color: string;
}

interface DashboardFilters {
  category: string;
  location: string;
  tag: string;
  minAmount: string;
  maxAmount: string;
  dateFrom: string;
  dateTo: string;
}

const initialFilters: DashboardFilters = {
  category: 'all',
  location: 'all',
  tag: 'all',
  minAmount: '',
  maxAmount: '',
  dateFrom: '',
  dateTo: '',
};

export default function DashboardPage() {
  const { user, queryUser } = useUserStore();
  const router = useRouter();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSettingOpen, setIsSettingOpen] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingTxs, setLoadingTxs] = useState(true);
  const [activeTab, setActiveTab] = useState<'expense' | 'income'>('expense');

  // Transfer state
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [transferAmount, setTransferAmount] = useState('');
  const [transferDirection, setTransferDirection] = useState<'account_to_inhand' | 'inhand_to_account'>('account_to_inhand');
  const [transferNote, setTransferNote] = useState('');
  const [transferLoading, setTransferLoading] = useState(false);

  // Month and advanced filter states
  const [selectedMonth, setSelectedMonth] = useState<string>('current'); // 'current', 'all', or 'yyyy-MM'
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [tempFilters, setTempFilters] = useState<DashboardFilters>(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState<DashboardFilters>(initialFilters);

  const fetchDashboardData = async () => {
    try {
      setLoadingTxs(true);
      const res = await fetch('/api/app/transactions?limit=100');
      if (res.ok) {
        const json = await res.json();
        setTransactions(json.data || []);
      } else {
        toast.error('Failed to load transaction details');
      }
    } catch (error) {
      console.error('Error fetching dashboard transactions:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoadingTxs(false);
    }
  };

  useEffect(() => {
    try {
      queryUser();
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  }, [queryUser]);

  useEffect(() => {
    if (!isEditOpen) {
      fetchDashboardData();
    }
  }, [isEditOpen]);

  const handleRefresh = async () => {
    await queryUser();
    await fetchDashboardData();
    toast.success('Dashboard refreshed');
  };

  const handleTransfer = async () => {
    const amt = parseFloat(transferAmount);
    if (!amt || amt <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    const inHandBalance = user?.stats.inHandBalance || 0;
    const accountBalance = user?.stats.accountBalance || 0;
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
        body: JSON.stringify({ amount: amt, direction: transferDirection, note: transferNote || undefined }),
      });
      if (res.ok) {
        const dirLabel = transferDirection === 'account_to_inhand' ? 'Account → In Hand' : 'In Hand → Account';
        toast.success(`${currencySymbol}${amt.toFixed(2)} transferred (${dirLabel})`);
        setIsTransferOpen(false);
        setTransferAmount('');
        setTransferNote('');
        queryUser();
        fetchDashboardData();
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

  if (!user) {
    return (
      <main className="relative flex items-start justify-center min-h-screen bg-[#F8F8F7]" >
        <div className="w-full max-w-md pb-28">
          <div className="flex items-center justify-between py-2 px-4 w-full bg-white">
            <Skeleton className="h-14 w-14 rounded-full bg-gray-200 ml-2" />
            <div className="flex-1 flex flex-col ml-3">
              <Skeleton className="h-5 w-32 mb-1 rounded bg-gray-200" />
              <Skeleton className="h-4 w-24 rounded bg-gray-200" />
            </div>
            <Skeleton className="w-10 h-10 rounded-full bg-gray-200" />
          </div>
          <div className="bg-white p-6 mt-4">
            <Skeleton className="h-5 w-32 mb-2 rounded bg-gray-200" />
            <Skeleton className="h-10 w-48 mb-4 rounded bg-gray-200" />
            <Skeleton className="h-24 w-full rounded bg-gray-200" />
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
  const userCategories = user.categories && user.categories.length > 0 ? user.categories : INITIAL_CATEGORIES;

  // Generate dynamic month list
  const currentMonthStr = new Date().toISOString().substring(0, 7); // e.g. '2026-07'
  
  const getAvailableMonths = () => {
    const months = new Set<string>();
    transactions.forEach(t => {
      const m = new Date(t.timestamp).toISOString().substring(0, 7);
      months.add(m);
    });
    // Ensure current month is always an option
    months.add(currentMonthStr);
    return Array.from(months).sort().reverse();
  };

  const formatMonthName = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  // Local filter handlers
  const handleLocalFilterChange = (key: keyof DashboardFilters, value: any) => {
    setTempFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const applyLocalFilters = () => {
    setAppliedFilters(tempFilters);
    setIsFilterOpen(false);
  };

  const resetLocalFilters = () => {
    setTempFilters(initialFilters);
    setAppliedFilters(initialFilters);
    setIsFilterOpen(false);
  };

  // Filter transactions dynamically
  const getFilteredTransactions = () => {
    return transactions.filter(t => {
      // 1. Filter by month
      if (selectedMonth !== 'all') {
        const tMonth = new Date(t.timestamp).toISOString().substring(0, 7);
        const targetMonth = selectedMonth === 'current' ? currentMonthStr : selectedMonth;
        if (tMonth !== targetMonth) return false;
      }
      
      // 2. Filter by category
      if (appliedFilters.category !== 'all') {
        if (t.category !== appliedFilters.category) return false;
      }
      
      // 3. Filter by location
      if (appliedFilters.location !== 'all') {
        if (t.location !== appliedFilters.location) return false;
      }
      
      // 4. Filter by tag
      if (appliedFilters.tag !== 'all') {
        if (!t.tags?.includes(appliedFilters.tag)) return false;
      }
      
      // 5. Filter by min amount
      if (appliedFilters.minAmount) {
        if (t.amount < parseFloat(appliedFilters.minAmount)) return false;
      }
      
      // 6. Filter by max amount
      if (appliedFilters.maxAmount) {
        if (t.amount > parseFloat(appliedFilters.maxAmount)) return false;
      }

      // 7. Filter by dateFrom
      if (appliedFilters.dateFrom) {
        if (new Date(t.timestamp) < new Date(appliedFilters.dateFrom)) return false;
      }

      // 8. Filter by dateTo
      if (appliedFilters.dateTo) {
        const endDate = new Date(appliedFilters.dateTo);
        endDate.setHours(23, 59, 59, 999);
        if (new Date(t.timestamp) > endDate) return false;
      }

      return true;
    });
  };

  const filteredTxs = getFilteredTransactions();

  // Calculate statistics for the filtered period
  let periodIncome = 0;
  let periodExpense = 0;
  filteredTxs.forEach(t => {
    if (t.type === 'income') {
      periodIncome += t.amount;
    } else {
      periodExpense += t.amount;
    }
  });

  const periodSavingsRate = periodIncome > 0 ? ((periodIncome - periodExpense) / periodIncome) * 100 : 0;
  const periodBurnRate = periodIncome > 0 ? (periodExpense / periodIncome) * 100 : 0;

  // Category breakdown calculation on filtered list
  const getCategoryBreakdown = (type: 'income' | 'expense'): BreakdownItem[] => {
    const filtered = filteredTxs.filter(t => t.type === type);
    const totals: Record<string, { amount: number; emoji: string }> = {};
    let grandTotal = 0;

    filtered.forEach(t => {
      grandTotal += t.amount;
      if (totals[t.category]) {
        totals[t.category].amount += t.amount;
      } else {
        totals[t.category] = { amount: t.amount, emoji: t.emoji || '💰' };
      }
    });

    return Object.entries(totals)
      .map(([name, data], idx) => ({
        name,
        amount: data.amount,
        emoji: data.emoji,
        percentage: grandTotal > 0 ? (data.amount / grandTotal) * 100 : 0,
        color: COLORS[idx % COLORS.length]
      }))
      .sort((a, b) => b.amount - a.amount);
  };

  // Location breakdown
  const getLocationBreakdown = (): BreakdownItem[] => {
    const filtered = filteredTxs.filter(t => t.type === 'expense');
    const totals: Record<string, number> = {};
    let grandTotal = 0;

    filtered.forEach(t => {
      if (t.location) {
        grandTotal += t.amount;
        totals[t.location] = (totals[t.location] || 0) + t.amount;
      }
    });

    return Object.entries(totals)
      .map(([name, amount], idx) => ({
        name,
        amount,
        percentage: grandTotal > 0 ? (amount / grandTotal) * 100 : 0,
        color: COLORS[idx % COLORS.length]
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  };

  // Tag breakdown
  const getTagBreakdown = (): BreakdownItem[] => {
    const filtered = filteredTxs.filter(t => t.type === 'expense');
    const totals: Record<string, number> = {};
    let grandTotal = 0;

    filtered.forEach(t => {
      if (t.tags && t.tags.length > 0) {
        t.tags.forEach(tag => {
          grandTotal += t.amount;
          totals[tag] = (totals[tag] || 0) + t.amount;
        });
      }
    });

    return Object.entries(totals)
      .map(([name, amount], idx) => ({
        name,
        amount,
        percentage: grandTotal > 0 ? (amount / grandTotal) * 100 : 0,
        color: COLORS[idx % COLORS.length]
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  };

  const activeBreakdown = getCategoryBreakdown(activeTab);
  const locationBreakdown = getLocationBreakdown();
  const tagBreakdown = getTagBreakdown();

  // Top large expenses in recent filtered list
  const topExpenses = filteredTxs
    .filter(t => t.type === 'expense')
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 3);

  // General user stats (overall balance)
  const balance = user.stats.balance || 0;
  const chartData = user.stats.monthlyBalances || [];

  // Active filter count badge
  const activeFilterCount = Object.entries(appliedFilters).reduce((count, [key, value]) => {
    if (key === 'category' || key === 'location' || key === 'tag') {
      return value !== 'all' ? count + 1 : count;
    }
    return value ? count + 1 : count;
  }, 0);

  return (
    <main className="relative flex items-start justify-center min-h-screen bg-[#F8F8F7]" >
      <div className="w-full max-w-md pb-28">
        <Head onMenuClick={() => setIsSettingOpen(true)} />

        {/* Dashboard Control Panel: Month Selector & Filters */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <LayoutDashboard className="w-5 h-5 text-gray-700 shrink-0" />
            <h1 className="text-lg font-bold text-gray-800 shrink-0 mr-2">Overview</h1>
            
            {/* Month Dropdown */}
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="h-8 py-0 px-2.5 text-xs bg-white border border-gray-200 rounded-lg min-w-32 focus:ring-0">
                <SelectValue placeholder="Select Month" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="current">Current Month ({formatMonthName(currentMonthStr)})</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
                {getAvailableMonths()
                  .filter(m => m !== currentMonthStr)
                  .map(m => (
                    <SelectItem key={m} value={m}>
                      {formatMonthName(m)}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-1">
            {/* Advanced Filters Button */}
            <button 
              onClick={() => {
                setTempFilters(appliedFilters);
                setIsFilterOpen(true);
              }}
              className={`relative p-1.5 rounded-full border transition-colors cursor-pointer ${activeFilterCount > 0 ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-100'}`}
              aria-label="Filter dashboard details"
            >
              <Filter className="w-4 h-4" />
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[9px] font-semibold text-white">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* Refresh Button */}
            <button 
              onClick={handleRefresh}
              className="p-1.5 bg-white border border-gray-200 hover:bg-gray-100 rounded-full transition-colors cursor-pointer text-gray-600"
              aria-label="Refresh dashboard data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter Dialog */}
        <Dialog open={isFilterOpen} onOpenChange={setIsFilterOpen}>
          <DialogContent className="max-h-[85dvh] flex flex-col">
            <DialogHeader>
              <DialogTitle>Filter Dashboard Data</DialogTitle>
            </DialogHeader>
            
            <div className="flex-1 overflow-y-auto pr-1">
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select
                      value={tempFilters.category}
                      onValueChange={(val) => handleLocalFilterChange('category', val)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        {userCategories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.name}>
                            {cat.name} ({cat.type})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Location</Label>
                    <Select
                      value={tempFilters.location}
                      onValueChange={(val) => handleLocalFilterChange('location', val)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select location" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        {user?.locations.map((loc) => (
                          <SelectItem key={loc.id} value={loc.name}>
                            {loc.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Min Amount</Label>
                    <Input
                      type="number"
                      value={tempFilters.minAmount}
                      onChange={(e) => handleLocalFilterChange('minAmount', e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Max Amount</Label>
                    <Input
                      type="number"
                      value={tempFilters.maxAmount}
                      onChange={(e) => handleLocalFilterChange('maxAmount', e.target.value)}
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>From Date</Label>
                    <Popover modal={true}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full">
                          {tempFilters.dateFrom ? new Date(tempFilters.dateFrom).toLocaleDateString() : 'Select Date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent>
                        <Calendar mode="single" selected={tempFilters.dateFrom ? new Date(tempFilters.dateFrom) : undefined} onSelect={(date) => {
                          if (date) {
                            handleLocalFilterChange('dateFrom', date.toISOString());
                          }
                        }} />
                      </PopoverContent>
                    </Popover>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>To Date</Label>
                    <Popover modal={true}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full">
                          {tempFilters.dateTo ? new Date(tempFilters.dateTo).toLocaleDateString() : 'Select Date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent>
                        <Calendar mode="single" selected={tempFilters.dateTo ? new Date(tempFilters.dateTo) : undefined} onSelect={(date) => {
                          if (date) {
                            handleLocalFilterChange('dateTo', date.toISOString());
                          }
                        }} />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Tag</Label>
                  <Select
                    value={tempFilters.tag}
                    onValueChange={(val) => handleLocalFilterChange('tag', val)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select tag" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {user?.tags.map((tag) => (
                        <SelectItem key={tag.id} value={tag.name}>
                          {tag.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <DialogFooter className="p-0 mt-4 border-t pt-4">
              <div className="flex justify-evenly space-x-2 w-full">
                <Button
                  variant="outline"
                  className="w-[45%] h-11"
                  onClick={resetLocalFilters}
                >
                  Reset
                </Button>
                <Button
                  className="w-[45%] h-11"
                  onClick={applyLocalFilters}
                >
                  Apply Filters
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Balance Card (Cumulative Wallet) */}
        <div className="bg-white p-6 mx-4 my-2 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <span className="text-gray-500 text-sm font-medium">Net Value</span>
            <div className="flex items-center gap-1 text-[11px] bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-medium">
              <Wallet className="w-3 h-3" />
              <span>Active Wallet</span>
            </div>
          </div>
          <h2 className="text-3xl font-bold text-black mt-2">
            {currencySymbol}<FormattedNumber value={balance.toFixed(2)} />
          </h2>
          
          {chartData.length > 1 && (
            <div className="mt-4 w-full h-[120px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ left: 0, right: 0, top: 8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2563eb" stopOpacity={0.15} />
                      <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 10, fill: "#9ca3af" }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(m) => {
                      if (typeof m !== 'string') return '';
                      const monthNum = Number(m.split('-')[1]);
                      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                      return months[monthNum - 1] || m;
                    }}
                  />
                  <YAxis hide={true} domain={['auto', 'auto']} />
                  <Tooltip 
                    formatter={(value: number) => [`${currencySymbol}${value.toFixed(2)}`, 'Balance']}
                    labelFormatter={(m) => {
                      if (typeof m !== 'string') return '';
                      const monthNum = Number(m.split('-')[1]);
                      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                      return months[monthNum - 1] || m;
                    }}
                    contentStyle={{ borderRadius: '10px', border: '1px solid #e5e7eb', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="balance" 
                    stroke="#2563eb" 
                    strokeWidth={2.5} 
                    dot={{ r: 3.5, fill: '#fff', stroke: '#2563eb', strokeWidth: 2 }}
                    activeDot={{ r: 5, fill: '#2563eb', stroke: '#fff', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* In Hand / In Account Split */}
          <div className="grid grid-cols-[1fr_auto_1fr] gap-2 mt-5 pt-4 border-t border-gray-100 items-center">
            <div className="space-y-1 bg-amber-50/60 border border-amber-100/60 p-3 rounded-2xl flex flex-col justify-center">
              <div className="text-gray-500 text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1.5 select-none">
                <span>💵</span> In Hand
              </div>
              <div className="text-lg font-bold text-amber-800">
                {currencySymbol}<FormattedNumber value={(user.stats.inHandBalance || 0).toFixed(2)} />
              </div>
            </div>
            <button
              onClick={() => setIsTransferOpen(true)}
              className="group flex items-center justify-center w-9 h-9 rounded-full bg-gray-100 hover:bg-indigo-100 border border-gray-200 hover:border-indigo-300 text-gray-400 hover:text-indigo-600 transition-all duration-200 cursor-pointer active:scale-90"
              aria-label="Transfer between wallets"
              title="Transfer money"
            >
              <ArrowRightLeft className="w-4 h-4 transition-transform duration-200 group-hover:rotate-180" />
            </button>
            <div className="space-y-1 bg-purple-50/60 border border-purple-100/60 p-3 rounded-2xl flex flex-col justify-center">
              <div className="text-gray-500 text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1.5 select-none">
                <span>💳</span> In Account
              </div>
              <div className="text-lg font-bold text-purple-800">
                {currencySymbol}<FormattedNumber value={(user.stats.accountBalance || 0).toFixed(2)} />
              </div>
            </div>
          </div>
        </div>

        {/* Expected Balance Card */}
        {(user.stats.upcomingCount ?? 0) > 0 && (
          <div 
            className="bg-gradient-to-br from-orange-50 to-amber-50 p-5 mx-4 my-2 rounded-2xl shadow-sm border border-orange-100 cursor-pointer hover:shadow-md transition-shadow duration-200"
            onClick={() => router.push('/home/upcoming')}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-sm font-medium">Expected Balance</span>
              <span className="text-[11px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                <CalendarClock className="w-3 h-3" />
                {user.stats.upcomingCount} planned
              </span>
            </div>
            <h2 className="text-2xl font-bold text-orange-800">
              {currencySymbol}<FormattedNumber value={(user.stats.expectedBalance ?? user.stats.balance).toFixed(2)} />
            </h2>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-xs text-gray-500">
                After all planned {user.stats.upcomingExpense ? `expenses (-${currencySymbol}${(user.stats.upcomingExpense).toFixed(2)})` : 'transactions'}
                {user.stats.upcomingIncome ? ` & income (+${currencySymbol}${(user.stats.upcomingIncome).toFixed(2)})` : ''}
              </span>
            </div>
            <p className="text-[10px] text-orange-600 font-medium mt-2">
              Tap to view & manage →
            </p>
          </div>
        )}

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
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Direction</Label>
                <div className="grid grid-cols-1 gap-2">
                  <button
                    type="button"
                    onClick={() => setTransferDirection('account_to_inhand')}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all duration-200 cursor-pointer text-left ${
                      transferDirection === 'account_to_inhand'
                        ? 'border-indigo-400 bg-indigo-50/80 shadow-sm'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
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
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all duration-200 cursor-pointer text-left ${
                      transferDirection === 'inhand_to_account'
                        ? 'border-indigo-400 bg-indigo-50/80 shadow-sm'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 flex-1 text-sm font-medium">
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-[10px] font-semibold">💵 In Hand</span>
                      <ArrowDown className="w-3.5 h-3.5 text-gray-400 rotate-[-90deg]" />
                      <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-[10px] font-semibold">💳 Account</span>
                    </div>
                  </button>
                </div>
              </div>
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
                    ? (user.stats.accountBalance || 0).toFixed(2)
                    : (user.stats.inHandBalance || 0).toFixed(2)
                  }
                </p>
              </div>
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
              <Button variant="outline" onClick={() => setIsTransferOpen(false)} disabled={transferLoading} className="cursor-pointer">Cancel</Button>
              <Button
                onClick={handleTransfer}
                disabled={transferLoading || !transferAmount}
                className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white cursor-pointer"
              >
                {transferLoading ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing...</>) : 'Transfer'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Cash Flow Summary Card (Filtered) */}
        <div className="bg-white p-6 mx-4 my-3 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-sm font-semibold text-gray-500 mb-4">
            Cash Flow ({selectedMonth === 'all' ? 'All Time' : formatMonthName(selectedMonth === 'current' ? currentMonthStr : selectedMonth)})
          </h3>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-green-50 text-green-600 rounded-xl">
                <ArrowUpRight className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] text-gray-400 block font-medium uppercase tracking-wider">Income</span>
                <span className="text-lg font-bold text-gray-800">
                  {currencySymbol}<FormattedNumber value={periodIncome.toFixed(2)} />
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-red-50 text-red-500 rounded-xl">
                <ArrowDownRight className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] text-gray-400 block font-medium uppercase tracking-wider">Expenses</span>
                <span className="text-lg font-bold text-gray-800">
                  {currencySymbol}<FormattedNumber value={periodExpense.toFixed(2)} />
                </span>
              </div>
            </div>
          </div>

          {/* savings rate split bar */}
          {periodIncome > 0 ? (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold text-gray-500">
                <span>Savings Rate: {periodSavingsRate.toFixed(1)}%</span>
                <span>Burn Rate: {periodBurnRate.toFixed(1)}%</span>
              </div>
              <div className="w-full h-3 rounded-full bg-gray-100 flex overflow-hidden">
                <div 
                  className="bg-green-500 h-full transition-all duration-500" 
                  style={{ width: `${Math.max(0, Math.min(100, 100 - periodBurnRate))}%` }}
                />
                <div 
                  className="bg-red-500 h-full transition-all duration-500" 
                  style={{ width: `${Math.max(0, Math.min(100, periodBurnRate))}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="text-xs text-gray-400 text-center border border-dashed py-3 rounded-xl">
              No cash flow logs to calculate savings rate for this period.
            </div>
          )}
        </div>

        {/* Dynamic Category Breakdown Card with Pie Chart */}
        <div className="bg-white p-5 mx-4 my-3 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-700">Category Share</h3>
            <div className="flex bg-gray-100 p-0.5 rounded-lg text-xs font-medium">
              <button 
                onClick={() => setActiveTab('expense')}
                className={`px-3 py-1 rounded-md transition-all cursor-pointer ${activeTab === 'expense' ? 'bg-white text-gray-800 shadow-xs' : 'text-gray-500'}`}
              >
                Expense
              </button>
              <button 
                onClick={() => setActiveTab('income')}
                className={`px-3 py-1 rounded-md transition-all cursor-pointer ${activeTab === 'income' ? 'bg-white text-gray-800 shadow-xs' : 'text-gray-500'}`}
              >
                Income
              </button>
            </div>
          </div>

          {loadingTxs ? (
            <div className="py-10 flex flex-col items-center justify-center space-y-4">
              <Skeleton className="w-24 h-24 rounded-full bg-gray-200" />
              <Skeleton className="w-40 h-4 bg-gray-200 rounded" />
            </div>
          ) : activeBreakdown.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-400 border border-dashed rounded-xl">
              No data logged for {activeTab === 'expense' ? 'expenses' : 'income'} during this period.
            </div>
          ) : (
            <div className="space-y-4">
              {/* Pie Chart display */}
              <div className="h-[140px] w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={activeBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={38}
                      outerRadius={55}
                      paddingAngle={3}
                      dataKey="amount"
                    >
                      {activeBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => [`${currencySymbol}${value.toFixed(2)}`, 'Total']}
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Breakdown List */}
              <div className="space-y-3">
                {activeBreakdown.map((item, idx) => (
                  <div key={item.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm">{item.emoji || '💰'}</span>
                        <span className="text-gray-700">{item.name}</span>
                        <span className="text-[10px] text-gray-400 font-normal">({item.percentage.toFixed(0)}%)</span>
                      </div>
                      <span className="text-gray-800">
                        {currencySymbol}{item.amount.toFixed(2)}
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-gray-50 overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-500" 
                        style={{ 
                          width: `${item.percentage}%`,
                          backgroundColor: item.color
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Location & Tag Breakdown details */}
        {!loadingTxs && (locationBreakdown.length > 0 || tagBreakdown.length > 0) && (
          <div className="grid grid-cols-1 gap-3 mx-4 my-3">
            {locationBreakdown.length > 0 && (
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="w-4 h-4 text-blue-500" />
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Top Locations</h3>
                </div>
                <div className="space-y-3">
                  {locationBreakdown.map(item => (
                    <div key={item.name} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-gray-700 truncate max-w-[150px]">{item.name}</span>
                        <span className="text-gray-800">{currencySymbol}{item.amount.toFixed(2)}</span>
                      </div>
                      <div className="w-full h-1 bg-gray-50 overflow-hidden">
                        <div 
                          className="h-full bg-blue-500 rounded-full" 
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tagBreakdown.length > 0 && (
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-2 mb-3">
                  <TagIcon className="w-4 h-4 text-purple-500" />
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Top Tags</h3>
                </div>
                <div className="space-y-3">
                  {tagBreakdown.map(item => (
                    <div key={item.name} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-gray-700 truncate max-w-[150px]">{item.name}</span>
                        <span className="text-gray-800">{currencySymbol}{item.amount.toFixed(2)}</span>
                      </div>
                      <div className="w-full h-1 bg-gray-50 overflow-hidden">
                        <div 
                          className="h-full bg-purple-500 rounded-full" 
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Top Single Expenses list */}
        {!loadingTxs && topExpenses.length > 0 && (
          <div className="bg-white p-5 mx-4 my-3 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Largest Transactions</h3>
            <div className="divide-y divide-gray-100">
              {topExpenses.map(tx => (
                <div key={tx.id} className="flex items-center justify-between py-2 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-base flex-shrink-0">{tx.emoji || '💸'}</span>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-700 truncate">{tx.category}</p>
                      {tx.note && <p className="text-[10px] text-gray-400 truncate max-w-[200px]">{tx.note}</p>}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="font-bold text-red-500">
                      -{currencySymbol}{tx.amount.toFixed(2)}
                    </span>
                    <p className="text-[9px] text-gray-400">
                      {new Date(tx.timestamp).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Modal overlays for dashboard */}
        {user && (
          <>
            <PopupEdit
              open={isEditOpen}
              onOpenChange={setIsEditOpen}
            />
            <Setting
              open={isSettingOpen}
              onOpenChange={(open) => {
                setIsSettingOpen(open);
                if (!open) {
                  queryUser();
                  fetchDashboardData();
                }
              }}
              user={user}
            />
          </>
        )}
      </div>

      {/* Floating Pill Menu */}
      <FloatingMenu onAddClick={() => setIsEditOpen(true)} />
    </main>
  );
}
