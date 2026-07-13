import { getServerSession } from "next-auth/next";
import { connectMongoose, supabase } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { exchangeRateService } from '@/lib/services/exchangeRate';
import { authOptions } from '@/app/utils/authOptions';

// GET /api/app/transactions/:id
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectMongoose();
    
    const { data: record, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', id)
      .eq('user_id', session.user.id)
      .maybeSingle();

    if (error || !record) {
      return NextResponse.json({ message: 'Transaction not found' }, { status: 404 });
    }

    const dto = {
      id: record.id,
      amount: Number(record.amount),
      originalAmount: record.original_amount ? Number(record.original_amount) : undefined,
      type: record.type,
      category: record.category,
      timestamp: new Date(record.timestamp),
      note: record.note,
      currency: record.currency,
      originalCurrency: record.original_currency,
      tags: record.tags || [],
      location: record.location,
      emoji: record.emoji,
      createdAt: new Date(record.created_at).toISOString(),
      updatedAt: new Date(record.updated_at).toISOString(),
    };
    return NextResponse.json({ message: 'ok', transaction: dto });
  } catch (error) {
    console.error('Error fetching transaction:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

// PATCH /api/app/transactions/:id
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const updates = await request.json();
    if (!updates || typeof updates !== 'object') {
      return NextResponse.json({ message: 'No update data provided' }, { status: 400 });
    }

    // Whitelist editable fields
    const { id: _, ...rawUpdates } = updates;
    const allowedFields = ['amount', 'originalAmount', 'type', 'category', 'timestamp', 'note', 'currency', 'originalCurrency', 'tags', 'location', 'emoji'];
    const safeUpdates: any = Object.fromEntries(
        Object.entries(rawUpdates).filter(([k]) => allowedFields.includes(k))
    );

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

    // If amount or currency is being updated, handle currency conversion
    if (safeUpdates.amount !== undefined || safeUpdates.currency !== undefined) {
      const { data: currentTransaction, error: transError } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', id)
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (transError || !currentTransaction) {
        return NextResponse.json({ message: 'Transaction not found' }, { status: 404 });
      }

      let convertedAmount = safeUpdates.amount;

      if (safeUpdates.originalCurrency !== user.currency) {
        try {
          convertedAmount = await exchangeRateService.convertCurrency(
            safeUpdates.originalAmount,
            safeUpdates.originalCurrency,
            user.currency
          );
        } catch (error) {
          console.error('Error converting currency:', error);
          return NextResponse.json(
            { message: 'Failed to convert currency' },
            { status: 500 }
          );
        }
      } else {
        convertedAmount = safeUpdates.originalAmount;
      }

      safeUpdates.amount = convertedAmount;
      safeUpdates.currency = user.currency;
    }

    const dbUpdates: any = {};
    if (safeUpdates.amount !== undefined) dbUpdates.amount = safeUpdates.amount;
    if (safeUpdates.originalAmount !== undefined) dbUpdates.original_amount = safeUpdates.originalAmount;
    if (safeUpdates.type !== undefined) dbUpdates.type = safeUpdates.type;
    if (safeUpdates.category !== undefined) dbUpdates.category = safeUpdates.category;
    if (safeUpdates.timestamp !== undefined) {
        dbUpdates.timestamp = new Date(safeUpdates.timestamp).toISOString();
    }
    if (safeUpdates.note !== undefined) dbUpdates.note = safeUpdates.note;
    if (safeUpdates.currency !== undefined) dbUpdates.currency = safeUpdates.currency;
    if (safeUpdates.originalCurrency !== undefined) dbUpdates.original_currency = safeUpdates.originalCurrency;
    if (safeUpdates.tags !== undefined) dbUpdates.tags = safeUpdates.tags;
    if (safeUpdates.location !== undefined) dbUpdates.location = safeUpdates.location;
    if (safeUpdates.emoji !== undefined) dbUpdates.emoji = safeUpdates.emoji;
    dbUpdates.updated_at = new Date().toISOString();

    const { data: updated, error: updateError } = await supabase
      .from('transactions')
      .update(dbUpdates)
      .eq('id', id)
      .eq('user_id', session.user.id)
      .select()
      .single();

    if (updateError || !updated) {
      console.error('Update transaction error:', updateError);
      return NextResponse.json({ message: 'Transaction not found or update failed' }, { status: 404 });
    }

    const dto = {
      id: updated.id,
      amount: Number(updated.amount),
      originalAmount: updated.original_amount ? Number(updated.original_amount) : undefined,
      currency: updated.currency,
      originalCurrency: updated.original_currency,
      type: updated.type,
      category: updated.category,
      timestamp: new Date(updated.timestamp),
      note: updated.note,
      tags: updated.tags || [],
      emoji: updated.emoji,
      location: updated.location,
      createdAt: new Date(updated.created_at).toISOString(),
      updatedAt: new Date(updated.updated_at).toISOString(),
    };

    return NextResponse.json({ message: 'Transaction updated', transaction: dto });
  } catch (error) {
    console.error('Error updating transaction:', error);
    return NextResponse.json({ message: 'Failed to update transaction' }, { status: 500 });
  }
}

// DELETE /api/app/transactions/:id
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectMongoose();
    
    const { data: deletedRecord, error: deleteError } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id)
      .eq('user_id', session.user.id)
      .select()
      .maybeSingle();

    if (deleteError || !deletedRecord) {
      return NextResponse.json({ message: 'Transaction not found' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Transaction deleted' });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    return NextResponse.json({ message: 'Failed to delete transaction' }, { status: 500 });
  }
}