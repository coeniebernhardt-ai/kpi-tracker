import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSafeErrorMessage, logSafeError } from '../../../lib/safe-api-error';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_EXT = ['.jpg', '.jpeg', '.png', '.webp'];
const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2MB

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing SUPABASE env vars');
  }
  return createClient(supabaseUrl, serviceRoleKey);
}

/** FEATURE A: Server-side validated image upload for admin notifications. Only admins can upload. */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const userId = formData.get('userId') as string | null;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'Image file is required' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('is_admin')
      .eq('id', userId)
      .single();

    if (profileError || !profile?.is_admin) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    // Server-side validation: type and size only (store reference, not binary in DB)
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid type. Allowed: jpg, png, webp' },
        { status: 400 }
      );
    }
    const ext = ALLOWED_EXT.find((e) => file.name.toLowerCase().endsWith(e)) || '.jpg';
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: `File too large. Max ${MAX_SIZE_BYTES / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    const name = `${crypto.randomUUID()}${ext}`;
    const filePath = `notification-images/${name}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from('tickets')
      .upload(filePath, file, { cacheControl: '3600', upsert: false });

    if (uploadError) {
      logSafeError('Upload error', uploadError);
      return NextResponse.json({ error: getSafeErrorMessage(uploadError) }, { status: 500 });
    }

    const { data: urlData } = supabaseAdmin.storage.from('tickets').getPublicUrl(filePath);
    return NextResponse.json({ url: urlData.publicUrl });
  } catch (err: unknown) {
    logSafeError('upload-notification-image', err);
    return NextResponse.json({ error: getSafeErrorMessage(err) }, { status: 500 });
  }
}
