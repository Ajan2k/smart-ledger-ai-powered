import { NextResponse } from 'next/server';
import { connectMongoose, supabase } from "@/lib/db";
import { AIService } from '@/lib/services/ai/pictureToBill';
import { exchangeRateService } from '@/lib/services/exchangeRate';
import { randomUUID } from 'crypto';
import crypto from 'crypto';
import { INITIAL_CATEGORIES } from "@/config/constants";

// Helper function to validate API token
async function validateToken(token: string) {
  await connectMongoose();
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('api_token', hashedToken)
    .maybeSingle();
  return user;
}

// Helper function to format transaction as text
function formatTransactionAsText(transaction: any): string {
  const { amount, type, category, note, currency, location, emoji, tags } = transaction;
  const typeText = type === 'income' ? 'Income' : 'Expense';
  const locationText = location ? `Location: ${location}` : 'No location';
  const tagsText = tags ? `Tags: ${tags.join(', ')}` : 'No tags';
  return `${emoji} ${typeText}: ${amount} ${currency}
🗂️ Category: ${category}
🏷️ ${tagsText}
📍 ${locationText}
📝 Note: ${note}`;
}

export async function POST(req: Request) {
  try {
    const token = req.headers.get('x-api-token');
    if (!token) {
      return new Response('API token required', { status: 401 });
    }
    const user = await validateToken(token);
    if (!user) {
      return new Response('Invalid API token', { status: 401 });
    }
    const formData = await req.formData();
    const image = formData.get('image') as File;
    if (!image) {
      return new Response('No image provided', { status: 400 });
    }
    const buffer = await image.arrayBuffer();
    const base64Image = Buffer.from(buffer).toString('base64');
    const aiService = new AIService();
    const userCategories = user.categories && user.categories.length > 0
      ? user.categories
      : INITIAL_CATEGORIES;

    const context = {
      timezone: 'UTC',
      userCurrency: user.currency,
      userLanguage: user.language,
      userTags: user.tags || [],
      userLocations: user.locations || [],
      userCategories
    };
    const recognizedTransaction = await aiService.recognizeBill(base64Image, image.type, context);
    if (!recognizedTransaction) {
      return new Response('No transaction information found in the image', { status: 400 });
    }
    // Prepare for preview (do not save yet)
    const userDefaultCurrency = user.currency || 'USD';
    const transactionCurrency = recognizedTransaction.currency || userDefaultCurrency;
    let convertedAmount = recognizedTransaction.amount;
    let originalAmount = recognizedTransaction.amount;
    let originalCurrency = transactionCurrency;
    if (transactionCurrency !== userDefaultCurrency) {
      try {
        convertedAmount = await exchangeRateService.convertCurrency(
          recognizedTransaction.amount,
          transactionCurrency,
          userDefaultCurrency
        );
      } catch (error) {
        console.error('Error converting currency:', error);
        return new Response('Failed to convert currency', { status: 500 });
      }
    }
    // Prepare transaction object for cache
    const pendingData = {
      userId: user.id,
      amount: convertedAmount,
      originalAmount: originalAmount,
      type: recognizedTransaction.type,
      category: recognizedTransaction.category,
      timestamp: new Date(recognizedTransaction.timestamp).toISOString(),
      note: recognizedTransaction.note,
      currency: userDefaultCurrency,
      originalCurrency: originalCurrency,
      tags: recognizedTransaction.tags || [],
      location: recognizedTransaction.location,
      emoji: recognizedTransaction.emoji,
    };

    // Clean up expired pending transactions (older than 1 minute)
    const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
    await supabase
      .from('pending_transactions')
      .delete()
      .lt('created_at', oneMinuteAgo);

    // Generate unique id
    const id = randomUUID();
    
    // Insert into pending_transactions in Supabase
    const { error: insertError } = await supabase
      .from('pending_transactions')
      .insert({
        id,
        user_id: user.id,
        data: pendingData
      });

    if (insertError) {
      console.error('Error saving pending transaction:', insertError);
      return new Response('Failed to prepare transaction', { status: 500 });
    }

    // Format preview text
    const textResponse = formatTransactionAsText({
      ...pendingData,
      currency: originalCurrency,
      amount: originalAmount,
    });
    return NextResponse.json({ id, result: textResponse });
  } catch (error) {
    console.error('Shortcut upload error:', error);
    return new Response('Failed to process image', { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const token = req.headers.get('x-api-token');
    if (!token) {
      return new Response('API token required', { status: 401 });
    }
    const user = await validateToken(token);
    if (!user) {
      return new Response('Invalid API token', { status: 401 });
    }

    const id = req.headers.get('id');
    if (!id) {
      return new Response('Missing transaction id in headers', { status: 400 });
    }

    // Clean up expired pending transactions (older than 1 minute)
    const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
    await supabase
      .from('pending_transactions')
      .delete()
      .lt('created_at', oneMinuteAgo);

    await connectMongoose();
    
    // Fetch from Supabase
    const { data: pending, error: fetchError } = await supabase
      .from('pending_transactions')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (fetchError || !pending) {
      return new Response('No pending transaction found or expired', { status: 404 });
    }

    // Actually save the transaction in Supabase
    const { error: saveError } = await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        amount: pending.data.amount,
        original_amount: pending.data.originalAmount,
        type: pending.data.type,
        category: pending.data.category,
        timestamp: pending.data.timestamp,
        note: pending.data.note,
        currency: pending.data.currency,
        original_currency: pending.data.originalCurrency,
        tags: pending.data.tags || [],
        location: pending.data.location,
        emoji: pending.data.emoji
      });

    if (saveError) {
      console.error('Failed to save shortcut transaction:', saveError);
      return new Response('Failed to save transaction', { status: 500 });
    }
    
    // Delete from pending table
    await supabase
      .from('pending_transactions')
      .delete()
      .eq('id', id);

    return new Response('🥳 Success!');
  } catch (error) {
    console.error('Shortcut upload GET error:', error);
    return new Response('Failed to save transaction', { status: 500 });
  }
}
