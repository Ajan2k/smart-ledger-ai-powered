import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/utils/authOptions";
import { NextResponse } from "next/server";
import { connectMongoose, supabase } from "@/lib/db";
import { INITIAL_CATEGORIES } from "@/config/constants";

// GET /api/app/me
export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        
        if (!session?.user?.id) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        await connectMongoose();
        
        // Fetch user from Supabase
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle();

        if (userError || !user) {
            return NextResponse.json({ message: 'User not found' }, { status: 404 });
        }

        // Fetch transaction metrics
        const { data: transData, error: transError } = await supabase
            .from('transactions')
            .select('amount, type, timestamp, account')
            .eq('user_id', session.user.id);

        if (transError) {
            console.error('Stats fetch error:', transError);
        }

        let totalIncome = 0;
        let totalExpense = 0;
        let inHandIncome = 0;
        let inHandExpense = 0;
        let accountIncome = 0;
        let accountExpense = 0;
        const totalCount = transData?.length || 0;

        if (transData) {
            for (const item of transData) {
                const amt = Number(item.amount);
                const isIncome = item.type === 'income';
                const isExpense = item.type === 'expense';
                const acc = item.account || 'inhand';

                if (isIncome) {
                    totalIncome += amt;
                    if (acc === 'inhand') inHandIncome += amt;
                    else if (acc === 'account') accountIncome += amt;
                } else if (isExpense) {
                    totalExpense += amt;
                    if (acc === 'inhand') inHandExpense += amt;
                    else if (acc === 'account') accountExpense += amt;
                }
            }
        }
        const balance = totalIncome - totalExpense;
        const inHandBalance = inHandIncome - inHandExpense;
        const accountBalance = accountIncome - accountExpense;

        // Generate past 8 months array
        const now = new Date();
        const months: string[] = [];
        for (let i = 7; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
        }

        // Initialize monthly grouping map
        const monthMap: Record<string, { income: number; expense: number }> = {};
        for (const m of months) {
            monthMap[m] = { income: 0, expense: 0 };
        }

        // Group transactions in JS memory
        if (transData) {
            for (const row of transData) {
                const date = new Date(row.timestamp);
                const ym = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                if (monthMap[ym]) {
                    const amt = Number(row.amount);
                    if (row.type === 'income') monthMap[ym].income += amt;
                    if (row.type === 'expense') monthMap[ym].expense += amt;
                }
            }
        }

        // Compute rolling balance
        let runningBalance = 0;
        const monthlyBalances = months.map(m => {
            runningBalance += (monthMap[m].income - monthMap[m].expense);
            return { month: m, balance: runningBalance };
        });

        return NextResponse.json({
            message: 'ok',
            data: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                apiToken: user.api_token,
                avatar: user.avatar,
                language: user.language,
                currency: user.currency,
                locations: (user.locations || []).map((loc: any) => ({
                    id: String(loc.id),
                    name: loc.name,
                    color: loc.color,
                    description: loc.description,
                })),
                tags: (user.tags || []).map((tag: any) => ({
                    id: String(tag.id),
                    name: tag.name,
                    color: tag.color,
                    description: tag.description,
                })),
                categories: (user.categories && user.categories.length > 0 ? user.categories : INITIAL_CATEGORIES).map((cat: any) => ({
                    id: String(cat.id),
                    name: cat.name,
                    type: cat.type,
                    color: cat.color,
                    description: cat.description,
                })),
                stats: {
                    totalIncome,
                    totalExpense,
                    balance,
                    inHandBalance,
                    accountBalance,
                    totalCount,
                    monthlyBalances
                },
                createdAt: new Date(user.created_at).toISOString(),
                updatedAt: new Date(user.updated_at).toISOString()
            }
        });
    } catch (error) {
        console.error('Error fetching user:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

// PATCH /api/app/me
export async function PATCH(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        
        if (!session?.user?.id) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const { name, avatar, language, currency, locations, tags, categories } = await req.json();
        await connectMongoose();

        // Helper to format tags/locations/categories with IDs for compatibility
        const cleanArrayItems = (arr: any[]) => {
            return (arr || []).map((item: any, idx: number) => {
                const cleaned: any = {
                    id: item.id || `item-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 9)}`,
                    name: item.name,
                    color: item.color,
                    description: item.description,
                };
                if (item.type !== undefined) cleaned.type = item.type;
                return cleaned;
            });
        };

        // Filter and update whitelisted fields
        const updateData: any = {};
        if (name) updateData.name = name;
        if (avatar !== undefined) updateData.avatar = avatar;
        if (language) updateData.language = language;
        if (currency) updateData.currency = currency;
        if (locations) updateData.locations = cleanArrayItems(locations);
        if (tags) updateData.tags = cleanArrayItems(tags);
        if (categories) updateData.categories = cleanArrayItems(categories);
        
        updateData.updated_at = new Date().toISOString();

        const { data: updatedUser, error: updateError } = await supabase
            .from('users')
            .update(updateData)
            .eq('id', session.user.id)
            .select()
            .single();

        if (updateError || !updatedUser) {
            console.error('Update profile error:', updateError);
            return NextResponse.json({ message: 'User not found or update failed' }, { status: 404 });
        }

        return NextResponse.json({ 
            message: 'User updated successfully', 
            data: {
                id: updatedUser.id,
                email: updatedUser.email,
                name: updatedUser.name,
                role: updatedUser.role,
                avatar: updatedUser.avatar,
                language: updatedUser.language,
                currency: updatedUser.currency,
                locations: (updatedUser.locations || []).map((loc: any) => ({
                    id: String(loc.id),
                    name: loc.name,
                    color: loc.color,
                    description: loc.description,
                })),
                tags: (updatedUser.tags || []).map((tag: any) => ({
                    id: String(tag.id),
                    name: tag.name,
                    color: tag.color,
                    description: tag.description,
                })),
                categories: (updatedUser.categories || []).map((cat: any) => ({
                    id: String(cat.id),
                    name: cat.name,
                    type: cat.type,
                    color: cat.color,
                    description: cat.description,
                })),
                createdAt: new Date(updatedUser.created_at).toISOString(),
                updatedAt: new Date(updatedUser.updated_at).toISOString()
            }
        });
    } catch (error) {
        console.error('Error updating user:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

// DELETE /api/app/me
export async function DELETE(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        
        if (!session?.user?.id) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        await connectMongoose();
        
        // Delete all user transactions first
        await supabase
            .from('transactions')
            .delete()
            .eq('user_id', session.user.id);

        // Delete user account
        const { data: deletedUser, error: deleteError } = await supabase
            .from('users')
            .delete()
            .eq('id', session.user.id)
            .select()
            .maybeSingle();
        
        if (deleteError || !deletedUser) {
            console.error('Delete account error:', deleteError);
            return NextResponse.json({ message: 'User not found' }, { status: 404 });
        }
        
        return NextResponse.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Error deleting user:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
