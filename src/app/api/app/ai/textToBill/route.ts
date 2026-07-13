import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/utils/authOptions";
import { AIService, AIContext } from '@/lib/services/ai/textToBill';
import { supabase } from "@/lib/db";
import { INITIAL_CATEGORIES } from "@/config/constants";

export async function POST(req: NextRequest) {
    try {
        // Check authentication
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get request body
        const body = await req.json();
        const text = body.text;
        const userCurrency = body.userCurrency || 'USD';
        const userLanguage = body.userLanguage || 'en';
        let userTags = [];
        let userLocations = [];
        try {
            userTags = typeof body.userTags === 'string' ? JSON.parse(body.userTags) : (body.userTags || []);
        } catch {
            userTags = [];
        }
        try {
            userLocations = typeof body.userLocations === 'string' ? JSON.parse(body.userLocations) : (body.userLocations || []);
        } catch {
            userLocations = [];
        }
        const localTime = body.localTime || new Date().toISOString();
        const timezone = body.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

        if (!text) {
            return NextResponse.json({
                error: 'Missing text input'
            }, { status: 400 });
        }

        // Fetch user categories from database
        const { data: dbUser } = await supabase
            .from('users')
            .select('categories')
            .eq('id', session.user.id)
            .maybeSingle();

        const userCategories = dbUser?.categories && dbUser.categories.length > 0
            ? dbUser.categories
            : INITIAL_CATEGORIES;

        // Prepare context
        const context: AIContext = {
            timezone,
            userCurrency,
            userLanguage,
            userTags,
            userLocations,
            userCategories,
            localTime,
        };

        try {
            const aiService = new AIService();
            const transaction = await aiService.recognizeBill(text, context);

            return NextResponse.json({
                success: true,
                result: transaction
            });
        } catch (error) {
            console.error('Error in bill generation:', error);
            return NextResponse.json({
                error: 'Failed to generate bill data'
            }, { status: 500 });
        }
    } catch (error) {
        console.error('Error in textToBill API:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}