import { getServerSession } from "next-auth/next";
import { authOptions } from '@/app/utils/authOptions';
import { connectMongoose, supabase } from '@/lib/db';
import { NextResponse } from 'next/server';

// POST /api/app/transactions/transfer
// Transfers money between "inhand" and "account" wallets.
// Creates two linked transactions: an expense from source and an income to destination.
export async function POST(req: Request): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { amount, direction, note } = body;

    // direction: 'account_to_inhand' or 'inhand_to_account'
    if (!amount || amount <= 0) {
      return NextResponse.json(
        { message: 'Amount must be a positive number' },
        { status: 400 }
      );
    }

    if (!direction || !['account_to_inhand', 'inhand_to_account'].includes(direction)) {
      return NextResponse.json(
        { message: 'Direction must be "account_to_inhand" or "inhand_to_account"' },
        { status: 400 }
      );
    }

    await connectMongoose();

    // Get user's default currency
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('currency')
      .eq('id', session.user.id)
      .maybeSingle();

    if (userError || !user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    const userCurrency = user.currency || 'USD';
    const now = new Date().toISOString();

    const sourceAccount = direction === 'account_to_inhand' ? 'account' : 'inhand';
    const destAccount = direction === 'account_to_inhand' ? 'inhand' : 'account';
    
    const sourceLabel = sourceAccount === 'account' ? 'Account' : 'In Hand';
    const destLabel = destAccount === 'account' ? 'Account' : 'In Hand';
    const transferNote = note || `Transfer from ${sourceLabel} to ${destLabel}`;

    // Create two transactions atomically: expense from source, income to destination
    const { data: transactions, error: insertError } = await supabase
      .from('transactions')
      .insert([
        {
          user_id: session.user.id,
          amount: Number(amount),
          original_amount: Number(amount),
          type: 'expense',
          category: 'Transfer',
          timestamp: now,
          note: transferNote,
          currency: userCurrency,
          original_currency: userCurrency,
          tags: ['transfer'],
          location: '',
          emoji: '🔄',
          account: sourceAccount,
        },
        {
          user_id: session.user.id,
          amount: Number(amount),
          original_amount: Number(amount),
          type: 'income',
          category: 'Transfer',
          timestamp: now,
          note: transferNote,
          currency: userCurrency,
          original_currency: userCurrency,
          tags: ['transfer'],
          location: '',
          emoji: '🔄',
          account: destAccount,
        },
      ])
      .select();

    if (insertError || !transactions || transactions.length !== 2) {
      console.error('Failed to create transfer transactions:', insertError);
      return NextResponse.json(
        { message: 'Failed to process transfer' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Transfer completed',
      transfer: {
        amount: Number(amount),
        direction,
        sourceAccount,
        destAccount,
        transactionIds: transactions.map(t => t.id),
      }
    });
  } catch (error) {
    console.error('Error processing transfer:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
