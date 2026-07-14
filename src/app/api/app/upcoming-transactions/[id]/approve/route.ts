import { getServerSession } from "next-auth/next";
import { authOptions } from '@/app/utils/authOptions';
import { connectMongoose, supabase } from '@/lib/db';
import { NextResponse } from 'next/server';

// POST /api/app/upcoming-transactions/[id]/approve
// Converts an upcoming transaction into a real transaction
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await connectMongoose();

    // 1. Fetch the upcoming transaction
    const { data: upcoming, error: fetchError } = await supabase
      .from('upcoming_transactions')
      .select('*')
      .eq('id', id)
      .eq('user_id', session.user.id)
      .eq('status', 'pending')
      .maybeSingle();

    if (fetchError || !upcoming) {
      return NextResponse.json(
        { message: 'Upcoming transaction not found or already approved' },
        { status: 404 }
      );
    }

    // 2. Create real transaction with today's date
    const { data: savedTransaction, error: insertError } = await supabase
      .from('transactions')
      .insert({
        user_id: session.user.id,
        amount: upcoming.amount,
        original_amount: upcoming.original_amount,
        type: upcoming.type,
        category: upcoming.category,
        timestamp: new Date().toISOString(), // Use today's date
        note: upcoming.note,
        currency: upcoming.currency,
        original_currency: upcoming.original_currency,
        tags: upcoming.tags || [],
        location: upcoming.location,
        emoji: upcoming.emoji,
        account: upcoming.account || 'inhand',
      })
      .select()
      .single();

    if (insertError || !savedTransaction) {
      console.error('Failed to create transaction from upcoming:', insertError);
      return NextResponse.json(
        { message: 'Failed to create transaction' },
        { status: 500 }
      );
    }

    // 3. Mark the upcoming transaction as approved
    const { error: updateError } = await supabase
      .from('upcoming_transactions')
      .update({ status: 'approved', updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', session.user.id);

    if (updateError) {
      console.error('Failed to mark upcoming as approved:', updateError);
    }

    // 4. Return the created transaction
    const transactionDTO = {
      id: savedTransaction.id,
      amount: Number(savedTransaction.amount),
      originalAmount: savedTransaction.original_amount ? Number(savedTransaction.original_amount) : undefined,
      type: savedTransaction.type,
      category: savedTransaction.category,
      timestamp: new Date(savedTransaction.timestamp),
      note: savedTransaction.note,
      currency: savedTransaction.currency,
      originalCurrency: savedTransaction.original_currency,
      emoji: savedTransaction.emoji,
      tags: savedTransaction.tags || [],
      location: savedTransaction.location,
      account: savedTransaction.account || 'inhand',
      createdAt: new Date(savedTransaction.created_at).toISOString(),
      updatedAt: new Date(savedTransaction.updated_at).toISOString(),
    };

    return NextResponse.json({
      message: 'Transaction approved and created',
      transaction: transactionDTO,
    });
  } catch (error) {
    console.error('Error approving upcoming transaction:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
