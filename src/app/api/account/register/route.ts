import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectMongoose, supabase } from '@/lib/db';
import { authRateLimiter } from '@/lib/rate-limit';
import { INITIAL_CATEGORIES } from '@/config/constants';

interface IUserTag {
    id?: string;
    name: string;
    color?: string;
    description?: string;
}

// Define initial tags and their colors
const initialTags: IUserTag[] = [
    // Food-related
    { name: 'Breakfast', color: '#E63946', description: 'Breakfast expenses' },
    { name: 'Lunch', color: '#D62828', description: 'Lunch expenses' },
    { name: 'Dinner', color: '#C1121F', description: 'Dinner expenses' },
    { name: 'Snacks', color: '#780000', description: 'Snacks and drinks' },
    { name: 'Groceries', color: '#9D0208', description: 'Fresh food' },
    
    // Transportation-related
    { name: 'Taxi', color: '#1A535C', description: 'Taxi expenses' },
    { name: 'Public', color: '#2A9D8F', description: 'Public transportation' },
    { name: 'Parking', color: '#006D77', description: 'Parking fees' },
    { name: 'Fuel', color: '#073B4C', description: 'Fuel expenses' },
    
    // Shopping-related
    { name: 'Clothing', color: '#7209B7', description: 'Clothing and accessories' },
    { name: 'Electronics', color: '#3A0CA3', description: 'Electronics and appliances' },
    { name: 'Beauty', color: '#4CC9F0', description: 'Personal care and beauty' },
    { name: 'Gifts', color: '#4361EE', description: 'Gifts and presents' },
    
    // Life services
    { name: 'Rent', color: '#2B2D42', description: 'Rent and utilities' },
    { name: 'Medical', color: '#8D0801', description: 'Medical and healthcare' },
    { name: 'Education', color: '#003049', description: 'Education and training' },
    { name: 'Entertainment', color: '#D90429', description: 'Leisure and entertainment' },
    
    // Others
    { name: 'Travel', color: '#1B4332', description: 'Travel and vacation' },
    { name: 'Social', color: '#2D6A4F', description: 'Social interactions' },
    { name: 'Pet', color: '#40916C', description: 'Pet-related expenses' },
    { name: 'Other', color: '#495057', description: 'Other expenses' }
];

export async function POST(request: NextRequest) {
    try {
        await connectMongoose(); // Stub connect

        const { email, password, name, avatar, inviteCode } = await request.json();

        // Rate limit check
        const ip = request.headers.get('x-forwarded-for') || 'unknown';
        if (!authRateLimiter.check(`register:${ip}`)) {
            return NextResponse.json({ message: 'Too many registration attempts. Please try again later.' }, { status: 429 });
        }

        // Validate required fields
        if (!email || !password || !name ) {
            return NextResponse.json(
                { message: 'All fields are required' },
                { status: 400 }
            );
        }

        // Validate password strength
        if (password.length < 8) {
            return NextResponse.json(
                { message: 'Password must be at least 8 characters long' },
                { status: 400 }
            );
        }

        // Validate invite code
        if (process.env.INVITE_CODE && inviteCode !== process.env.INVITE_CODE) {
            return NextResponse.json(
                { message: 'Invalid invite code' },
                { status: 403 }
            );
        }

        // Validate that email is verified in Supabase
        const { data: verifiedRecord, error: verifyError } = await supabase
            .from('verification_codes')
            .select('*')
            .eq('email', email)
            .eq('is_verified', true)
            .maybeSingle();

        if (verifyError || !verifiedRecord) {
            return NextResponse.json(
                { message: 'Email must be verified before registration' },
                { status: 403 }
            );
        }

        // Check if email already exists
        const { data: existingUser, error: checkError } = await supabase
            .from('users')
            .select('id')
            .eq('email', email)
            .maybeSingle();

        if (existingUser) {
            return NextResponse.json(
                { message: 'Email already registered' },
                { status: 400 }
            );
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Remove verification record
        await supabase
            .from('verification_codes')
            .delete()
            .eq('email', email);

        // Assign IDs to initial tags for compatibility
        const tagsWithIds = initialTags.map((tag, idx) => ({
            id: `tag-${idx}`,
            name: tag.name,
            color: tag.color,
            description: tag.description
        }));
        
        // Create new user in Supabase
        const { data: savedUser, error: saveError } = await supabase
            .from('users')
            .insert({
                email,
                name,
                password: hashedPassword,
                role: 'user',
                avatar: avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
                language: 'en',
                currency: 'USD',
                locations: [],
                tags: tagsWithIds,
                categories: INITIAL_CATEGORIES,
            })
            .select()
            .single();

        if (saveError || !savedUser) {
            console.error('Database save error:', saveError);
            return NextResponse.json(
                { message: 'Failed to create user account' },
                { status: 500 }
            );
        }

        return NextResponse.json(
            { 
                message: 'Registration successful',
                user: {
                    id: savedUser.id,
                    email: savedUser.email,
                    name: savedUser.name,
                    role: savedUser.role,
                    avatar: savedUser.avatar,
                    language: savedUser.language,
                    currency: savedUser.currency,
                    locations: (savedUser.locations || []).map((loc: any) => ({
                        id: String(loc.id),
                        name: loc.name,
                        color: loc.color,
                        description: loc.description,
                    })),
                    tags: (savedUser.tags || []).map((tag: any) => ({
                        id: String(tag.id),
                        name: tag.name,
                        color: tag.color,
                        description: tag.description,
                    })),
                    categories: (savedUser.categories || []).map((cat: any) => ({
                        id: String(cat.id),
                        name: cat.name,
                        type: cat.type,
                        color: cat.color,
                        description: cat.description,
                    })),
                    createdAt: new Date(savedUser.created_at).toISOString(),
                    updatedAt: new Date(savedUser.updated_at).toISOString()
                }
            },
            { status: 201 }
        );
    } catch (error) {
        console.error('Registration error:', error);
        return NextResponse.json(
            { message: 'Internal server error' },
            { status: 500 }
        );
    }
}