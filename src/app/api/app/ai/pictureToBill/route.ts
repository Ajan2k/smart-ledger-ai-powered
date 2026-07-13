import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/utils/authOptions";
import { AIService } from '@/lib/services/ai/pictureToBill';
import { supabase } from "@/lib/db";
import { INITIAL_CATEGORIES } from "@/config/constants";

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        let formData;
        try {
            formData = await req.formData();
        } catch (err) {
            return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
        }

        if (!formData.has('file')) {
            return NextResponse.json({ error: 'Missing image file' }, { status: 400 });
        }

        // Get timezone from form data or use UTC as fallback
        const timezone = formData.get('timezone')?.toString() || 'UTC';
        // Get user preferences
        const userCurrency = formData.get('userCurrency')?.toString() || 'USD';
        const userLanguage = formData.get('userLanguage')?.toString() || 'en';
        let userTags = [];
        let userLocations = [];
        try {
            userTags = JSON.parse(formData.get('userTags')?.toString() || '[]');
        } catch {
            userTags = [];
        }
        try {
            userLocations = JSON.parse(formData.get('userLocations')?.toString() || '[]');
        } catch {
            userLocations = [];
        }

        const imageFile = formData.get('file') as File;
        const arrayBuffer = await imageFile.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');

        // Initialize AI service
        const aiService = new AIService();

        // Fetch user categories from database
        const { data: dbUser } = await supabase
            .from('users')
            .select('categories')
            .eq('id', session.user.id)
            .maybeSingle();

        const userCategories = dbUser?.categories && dbUser.categories.length > 0
            ? dbUser.categories
            : INITIAL_CATEGORIES;

        // Prepare context for AI
        const context = {
            timezone,
            userCurrency,
            userLanguage,
            userTags,
            userLocations,
            userCategories
        };

        // Recognize bill from image
        const transaction = await aiService.recognizeBill(base64, imageFile.type, context);

        if (!transaction) {
            return NextResponse.json({ 
                success: false,
                error: 'No transaction information found in the image' 
            });
        }

        return NextResponse.json({ 
            success: true, 
            result: transaction 
        });
    } catch (error) {
        console.error('Error in pictureToBill API:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}