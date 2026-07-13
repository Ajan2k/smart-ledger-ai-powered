import { getServerSession } from "next-auth/next";
import { authOptions } from '@/app/utils/authOptions';
import { connectMongoose, supabase } from '@/lib/db';
import { NextResponse } from 'next/server';
import { exchangeRateService } from '@/lib/services/exchangeRate';

type Pagination = {
  total: number;
  page: number;
  limit: number;
};

// GET /api/app/transactions
export async function GET(req: Request): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = parseInt(url.searchParams.get('limit') || '10', 10);

    await connectMongoose();

    let query = supabase
      .from('transactions')
      .select('*', { count: 'exact' })
      .eq('user_id', session.user.id);
    
    // Handle type filter
    const type = url.searchParams.get('type');
    if (type && type !== 'all') {
      query = query.eq('type', type);
    }

    // Handle category filter
    const category = url.searchParams.get('category');
    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    // Handle amount range filters
    const minAmount = url.searchParams.get('minAmount');
    const maxAmount = url.searchParams.get('maxAmount');
    if (minAmount) {
      query = query.gte('amount', parseFloat(minAmount));
    }
    if (maxAmount) {
      query = query.lte('amount', parseFloat(maxAmount));
    }

    // Handle date range filters
    const dateFrom = url.searchParams.get('dateFrom');
    const dateTo = url.searchParams.get('dateTo');
    if (dateFrom) {
      query = query.gte('timestamp', new Date(dateFrom).toISOString());
    }
    if (dateTo) {
      const endDate = new Date(dateTo);
      endDate.setHours(23, 59, 59, 999);
      query = query.lte('timestamp', endDate.toISOString());
    }

    // Handle location filter
    const location = url.searchParams.get('location');
    if (location && location !== 'all') {
      query = query.eq('location', location);
    }

    // Handle tags filter (checks if transaction tags array overlaps with filter tags)
    const tags = url.searchParams.getAll('tags');
    if (tags.length > 0) {
      const tagConditions = tags.map(tag => `tags.cs.${JSON.stringify([tag])}`).join(',');
      query = query.or(tagConditions);
    }

    // Pagination bounds
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data: docs, count, error } = await query
      .order('timestamp', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('Fetch transactions error:', error);
      throw error;
    }

    const total = count || 0;

    const data = (docs || []).map(doc => ({
      id: doc.id,
      amount: Number(doc.amount),
      originalAmount: doc.original_amount ? Number(doc.original_amount) : undefined,
      type: doc.type,
      category: doc.category,
      timestamp: new Date(doc.timestamp),
      note: doc.note,
      currency: doc.currency,
      originalCurrency: doc.original_currency,
      tags: doc.tags || [],
      emoji: doc.emoji,
      location: doc.location,
      createdAt: new Date(doc.created_at).toISOString(),
      updatedAt: new Date(doc.updated_at).toISOString(),
    }));

    const pagination: Pagination = { total, page, limit };
    const isEnd = page * limit >= total;
    
    return NextResponse.json({ message: 'ok', data, pagination, isEnd });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/app/transactions
export async function POST(req: Request): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();

    // Always treat amount/currency as originalAmount/originalCurrency
    const originalAmount = body.originalAmount !== undefined ? body.originalAmount : body.amount;
    const originalCurrency = body.originalCurrency || body.currency;
    const { type, category, timestamp } = body;
    if (originalAmount == null || !type || !category || !timestamp) {
      return NextResponse.json(
        { message: 'Missing required fields: amount, type, category or timestamp' },
        { status: 400 }
      );
    }

    await connectMongoose();
    
    // Get user's default currency from Supabase
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
    } else {
      convertedAmount = originalAmount;
    }

    // Insert transaction in Supabase
    const { data: savedTransaction, error: insertError } = await supabase
      .from('transactions')
      .insert({
        user_id: session.user.id,
        amount: convertedAmount,
        original_amount: originalAmount,
        type,
        category,
        timestamp: new Date(timestamp).toISOString(),
        note: body.note,
        currency: userDefaultCurrency,
        original_currency: originalCurrency,
        tags: body.tags || [],
        location: body.location,
        emoji: body.emoji,
      })
      .select()
      .single();

    if (insertError || !savedTransaction) {
      console.error('Failed to create transaction in Supabase:', insertError);
      return NextResponse.json(
        { message: 'Failed to save transaction' },
        { status: 500 }
      );
    }

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
      createdAt: new Date(savedTransaction.created_at).toISOString(),
      updatedAt: new Date(savedTransaction.updated_at).toISOString(),
    };

    return NextResponse.json({ message: 'Transaction created', transaction: transactionDTO });
  } catch (error) {
    console.error('Error creating transaction:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}