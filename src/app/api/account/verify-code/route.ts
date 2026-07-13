import { NextResponse } from 'next/server';
import { connectMongoose, supabase } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { email, code } = await request.json();

    if (!email || !code) {
      return NextResponse.json(
        { message: 'Email and verification code are required' },
        { status: 400 }
      );
    }

    await connectMongoose();

    // Clean up expired verification codes (older than 10 minutes)
    const tenMinutesAgo = new Date(Date.now() - 600 * 1000).toISOString();
    await supabase
        .from('verification_codes')
        .delete()
        .lt('created_at', tenMinutesAgo);

    // Get the stored code from Supabase
    const { data: storedRecord, error: fetchError } = await supabase
        .from('verification_codes')
        .select('*')
        .eq('email', email)
        .maybeSingle();

    if (fetchError || !storedRecord) {
      return NextResponse.json(
        { message: 'No verification code found or it has expired' },
        { status: 400 }
      );
    }

    // Compare the codes
    if (storedRecord.code !== code) {
      return NextResponse.json(
        { message: 'Invalid verification code' },
        { status: 400 }
      );
    }

    // Mark as verified in Supabase
    const { error: updateError } = await supabase
        .from('verification_codes')
        .update({ is_verified: true })
        .eq('id', storedRecord.id);

    if (updateError) {
        console.error('Failed to mark code as verified:', updateError);
        throw updateError;
    }

    return NextResponse.json(
      { message: 'Code verified successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in verify-code:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}