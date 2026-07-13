'use client';

import { LayoutDashboard, Plus, ReceiptText } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

interface FloatingMenuProps {
  onAddClick?: () => void;
}

export default function FloatingMenu({ onAddClick }: FloatingMenuProps) {
  const pathname = usePathname();
  const router = useRouter();

  const isDashboard = pathname === '/home';
  const isTransactions = pathname === '/home/transactions';

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-[280px] transition-all duration-300">
      <div className="flex items-center justify-around bg-white/90 backdrop-blur-md border border-gray-200/50 shadow-xl rounded-full px-4 py-2">
        {/* Dashboard Option */}
        <button
          onClick={() => router.push('/home')}
          className={cn(
            "flex flex-col items-center justify-center p-1.5 rounded-full transition-all duration-300 cursor-pointer",
            isDashboard
              ? "text-blue-600 scale-110 font-semibold"
              : "text-gray-500 hover:text-gray-900 hover:scale-105"
          )}
          aria-label="Dashboard"
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[10px] font-medium mt-0.5">Dashboard</span>
        </button>

        {/* Elevated Plus Button */}
        <button
          onClick={onAddClick}
          className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-500/25 hover:shadow-lg hover:shadow-blue-500/40 active:scale-95 transition-all duration-200 -translate-y-4 cursor-pointer"
          aria-label="Add transaction"
        >
          <Plus className="w-6 h-6 stroke-[2.5]" />
        </button>

        {/* Transactions Option */}
        <button
          onClick={() => router.push('/home/transactions')}
          className={cn(
            "flex flex-col items-center justify-center p-1.5 rounded-full transition-all duration-300 cursor-pointer",
            isTransactions
              ? "text-blue-600 scale-110 font-semibold"
              : "text-gray-500 hover:text-gray-900 hover:scale-105"
          )}
          aria-label="Transactions"
        >
          <ReceiptText className="w-5 h-5" />
          <span className="text-[10px] font-medium mt-0.5">Transactions</span>
        </button>
      </div>
    </div>
  );
}
