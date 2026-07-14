import { getServerSession } from "next-auth/next";
import { authOptions } from '@/app/utils/authOptions';
import { connectMongoose, supabase } from '@/lib/db';
import { NextResponse } from 'next/server';
import { exchangeRateService } from '@/lib/services/exchangeRate';

// GET /api/app/upcoming-transactions — fetch all pending upcoming transactions
export async function GET(req: Request): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectMongoose();

    const { data: docs, error } = await supabase
      .from('upcoming_transactions')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('status', 'pending')
      .order('expected_date', { ascending: true });

    if (error) {
      console.error('Fetch upcoming transactions error:', error);
      throw error;
    }

    const data = (docs || []).map(doc => ({
      id: doc.id,
      amount: Number(doc.amount),
      originalAmount: doc.original_amount ? Number(doc.original_amount) : undefined,
      type: doc.type,
      category: doc.category,
      expectedDate: new Date(doc.expected_date),
      note: doc.note,
      currency: doc.currency,
      originalCurrency: doc.original_currency,
      tags: doc.tags || [],
      emoji: doc.emoji,
      location: doc.location,
      account: doc.account || 'inhand',
      status: doc.status,
      createdAt: new Date(doc.created_at).toISOString(),
      updatedAt: new Date(doc.updated_at).toISOString(),
    }));

    return NextResponse.json({ message: 'ok', data });
  } catch (error) {
    console.error('Error fetching upcoming transactions:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/app/upcoming-transactions — create a new upcoming transaction
export async function POST(req: Request): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();

    const originalAmount = body.originalAmount !== undefined ? body.originalAmount : body.amount;
    const originalCurrency = body.originalCurrency || body.currency;
    const { type, category, expectedDate, account = 'inhand' } = body;

    if (originalAmount == null || !type || !category || !expectedDate) {
      return NextResponse.json(
        { message: 'Missing required fields: amount, type, category or expectedDate' },
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

    const userDefaultCurrency = user.currency || 'USD';
    let convertedAmount = originalAmount;

    if (originalCurrency !== userDefaultCurrency) {
      try {
        convertedAmount = await exchangeRateService.convertCurrency(
          originalAmount,
          originalCurrency,
          userDefaultCurrency
        );
      } catch (error) {
        console.error('Error converting currency:', error);
        return NextResponse.json(
          { message: 'Failed to convert currency' },
          { status: 500 }
        );
      }
    }

    const { data: saved, error: insertError } = await supabase
      .from('upcoming_transactions')
      .insert({
        user_id: session.user.id,
        amount: convertedAmount,
        original_amount: originalAmount,
        type,
        category,
        expected_date: new Date(expectedDate).toISOString(),
        note: body.note,
        currency: userDefaultCurrency,
        original_currency: originalCurrency,
        tags: body.tags || [],
        location: body.location,
        emoji: body.emoji,
        account,
        status: 'pending',
      })
      .select()
      .single();

    if (insertError || !saved) {
      console.error('Failed to create upcoming transaction:', insertError);
      return NextResponse.json(
        { message: 'Failed to save upcoming transaction' },
        { status: 500 }
      );
    }

    const dto = {
      id: saved.id,
      amount: Number(saved.amount),
      originalAmount: saved.original_amount ? Number(saved.original_amount) : undefined,
      type: saved.type,
      category: saved.category,
      expectedDate: new Date(saved.expected_date),
      note: saved.note,
      currency: saved.currency,
      originalCurrency: saved.original_currency,
      emoji: saved.emoji,
      tags: saved.tags || [],
      location: saved.location,
      account: saved.account || 'inhand',
      status: saved.status,
      createdAt: new Date(saved.created_at).toISOString(),
      updatedAt: new Date(saved.updated_at).toISOString(),
    };

    return NextResponse.json({ message: 'Upcoming transaction created', transaction: dto });
  } catch (error) {
    console.error('Error creating upcoming transaction:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
