import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/utils/authOptions";
import { NextResponse } from "next/server";
import { connectMongoose, supabase } from "@/lib/db";

// GET /api/admin/users
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    await connectMongoose();
    
    // Check if the requesting user is an admin
    const { data: adminUser, error: adminError } = await supabase
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .maybeSingle();

    if (adminError || !adminUser || adminUser.role !== 'admin') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    // Fetch all users except password field
    const { data: users, error: fetchError } = await supabase
      .from('users')
      .select('id, email, name, role, avatar, language, currency, locations, tags, categories, api_token, created_at, updated_at');

    if (fetchError) {
      console.error('Fetch users error:', fetchError);
      throw fetchError;
    }

    const usersDTO = (users || []).map(u => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      avatar: u.avatar,
      language: u.language,
      currency: u.currency,
      locations: u.locations || [],
      tags: u.tags || [],
      categories: u.categories || [],
      apiToken: u.api_token,
      createdAt: new Date(u.created_at).toISOString(),
      updatedAt: new Date(u.updated_at).toISOString(),
    }));

    return NextResponse.json({ message: 'ok', users: usersDTO });
  } catch (error) {
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

// PATCH /api/admin/users
export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    await connectMongoose();

    // Check if requester is admin
    const { data: adminUser, error: adminError } = await supabase
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .maybeSingle();

    if (adminError || !adminUser || adminUser.role !== 'admin') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const { id, ...updateData } = await req.json();
    if (!id) return NextResponse.json({ message: 'User id required' }, { status: 400 });

    const allowList = ['name', 'email', 'role', 'language', 'currency', 'avatar'];
    const safeUpdates = Object.fromEntries(
        Object.entries(updateData).filter(([k]) => allowList.includes(k))
    );

    safeUpdates.updated_at = new Date().toISOString();

    const { data: updated, error: updateError } = await supabase
      .from('users')
      .update(safeUpdates)
      .eq('id', id)
      .select('id, email, name, role, avatar, language, currency, locations, tags, categories, api_token, created_at, updated_at')
      .single();

    if (updateError || !updated) {
      console.error('Admin user update error:', updateError);
      return NextResponse.json({ message: 'User not found or update failed' }, { status: 404 });
    }

    const updatedDTO = {
      id: updated.id,
      email: updated.email,
      name: updated.name,
      role: updated.role,
      avatar: updated.avatar,
      language: updated.language,
      currency: updated.currency,
      locations: updated.locations || [],
      tags: updated.tags || [],
      categories: updated.categories || [],
      apiToken: updated.api_token,
      createdAt: new Date(updated.created_at).toISOString(),
      updatedAt: new Date(updated.updated_at).toISOString(),
    };

    return NextResponse.json({ message: 'User updated', user: updatedDTO });
  } catch (error) {
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE /api/admin/users
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    await connectMongoose();

    // Check if requester is admin
    const { data: adminUser, error: adminError } = await supabase
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .maybeSingle();

    if (adminError || !adminUser || adminUser.role !== 'admin') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const { id } = await req.json();
    if (!id) return NextResponse.json({ message: 'User id required' }, { status: 400 });

    // Cascading delete transactions first
    await supabase.from('transactions').delete().eq('user_id', id);

    // Delete user
    const { data: deleted, error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', id)
      .select()
      .maybeSingle();

    if (deleteError || !deleted) {
      console.error('Admin user delete error:', deleteError);
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }
    return NextResponse.json({ message: 'User deleted' });
  } catch (error) {
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
} 