import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/utils/authOptions";
import { connectMongoose, supabase } from "@/lib/db";
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { currentPassword, newEmail } = await req.json();

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    await connectMongoose();
    
    // Check if new email already exists
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('email', newEmail)
      .maybeSingle();

    if (existingUser) {
      return NextResponse.json({ error: 'Email already in use' }, { status: 400 });
    }

    // Get user and verify current password
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', session.user.id)
      .maybeSingle();

    if (userError || !user?.password) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
    }

    // Update email
    const { error: updateError } = await supabase
      .from('users')
      .update({ email: newEmail, updated_at: new Date().toISOString() })
      .eq('id', session.user.id);

    if (updateError) {
      console.error('Email update error:', updateError);
      throw updateError;
    }

    return NextResponse.json({ message: 'Email updated successfully' });
  } catch (error) {
    console.error('Email change error:', error);
    return NextResponse.json(
      { error: 'Failed to change email' },
      { status: 500 }
    );
  }
} 