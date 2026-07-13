import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/utils/authOptions";
import { connectMongoose, supabase } from "@/lib/db";
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectMongoose();

    // Generate a new API token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    // Update user with new token in Supabase
    const { error: updateError } = await supabase
      .from('users')
      .update({ api_token: hashedToken, updated_at: new Date().toISOString() })
      .eq('id', session.user.id);

    if (updateError) {
      console.error('API token update error:', updateError);
      throw updateError;
    }

    return NextResponse.json({ 
      message: 'API token generated successfully',
      apiToken: rawToken 
    });
  } catch (error) {
    console.error('API token generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate API token' },
      { status: 500 }
    );
  }
}