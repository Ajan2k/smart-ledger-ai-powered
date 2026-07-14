import { getServerSession } from "next-auth/next";
import { authOptions } from '@/app/utils/authOptions';
import { connectMongoose, supabase } from '@/lib/db';
import { NextResponse } from 'next/server';

// DELETE /api/app/upcoming-transactions/[id]
export async function DELETE(
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

    const { error } = await supabase
      .from('upcoming_transactions')
      .delete()
      .eq('id', id)
      .eq('user_id', session.user.id);

    if (error) {
      console.error('Delete upcoming transaction error:', error);
      return NextResponse.json({ message: 'Failed to delete' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Upcoming transaction deleted' });
  } catch (error) {
    console.error('Error deleting upcoming transaction:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

// PATCH /api/app/upcoming-transactions/[id]
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    await connectMongoose();

    const updateData: any = {};
    if (body.amount !== undefined) updateData.amount = body.amount;
    if (body.originalAmount !== undefined) updateData.original_amount = body.originalAmount;
    if (body.type) updateData.type = body.type;
    if (body.category) updateData.category = body.category;
    if (body.expectedDate) updateData.expected_date = new Date(body.expectedDate).toISOString();
    if (body.note !== undefined) updateData.note = body.note;
    if (body.currency) updateData.currency = body.currency;
    if (body.originalCurrency) updateData.original_currency = body.originalCurrency;
    if (body.tags) updateData.tags = body.tags;
    if (body.location !== undefined) updateData.location = body.location;
    if (body.emoji) updateData.emoji = body.emoji;
    if (body.account) updateData.account = body.account;
    updateData.updated_at = new Date().toISOString();

    const { data: updated, error } = await supabase
      .from('upcoming_transactions')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', session.user.id)
      .select()
      .single();

    if (error || !updated) {
      console.error('Update upcoming transaction error:', error);
      return NextResponse.json({ message: 'Failed to update' }, { status: 500 });
    }

    const dto = {
      id: updated.id,
      amount: Number(updated.amount),
      originalAmount: updated.original_amount ? Number(updated.original_amount) : undefined,
      type: updated.type,
      category: updated.category,
      expectedDate: new Date(updated.expected_date),
      note: updated.note,
      currency: updated.currency,
      originalCurrency: updated.original_currency,
      emoji: updated.emoji,
      tags: updated.tags || [],
      location: updated.location,
      account: updated.account || 'inhand',
      status: updated.status,
      createdAt: new Date(updated.created_at).toISOString(),
      updatedAt: new Date(updated.updated_at).toISOString(),
    };

    return NextResponse.json({ message: 'Updated', transaction: dto });
  } catch (error) {
    console.error('Error updating upcoming transaction:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
