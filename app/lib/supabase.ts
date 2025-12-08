import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// Types
export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: string;
  avatar?: string;
  avatar_url?: string;
  definition?: string;
  responsibilities?: string[];
  is_admin: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  kpi_config?: {
    kpis: {
      name: string;
      target: number;
      current: number;
      unit: string;
      category: string;
    }[];
  };
}

export interface Ticket {
  id: string;
  ticket_number: string;
  user_id: string;
  client: string;
  clickup_ticket?: string;
  location: 'on-site' | 'remote';
  status: 'open' | 'closed';
  issue: string;
  resolution?: string;
  response_time_minutes?: number;
  created_at: string;
  closed_at?: string;
  created_by?: string;
  has_dependencies?: boolean;
  dependency_name?: string;
  ticket_type?: 'Hardware' | 'Software';
  estate_or_building?: string;
  cml_location?: string;
  updates?: { text: string; timestamp: string }[];
  time_logs?: { minutes: number; description: string; timestamp: string; logged_by?: string }[];
  total_time_minutes?: number;
  profile?: Profile;
}

// Auth helpers
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
}

export async function signUp(email: string, password: string, fullName: string, role: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        role: role,
      },
    },
  });
  return { data, error };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  return { error };
}

export async function resetPassword(email: string) {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  return { data, error };
}

export async function updatePassword(newPassword: string) {
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword
  });
  return { data, error };
}

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function getCurrentProfile(userId?: string): Promise<Profile | null> {
  try {
    let uid = userId;
    
    if (!uid) {
      const user = await getCurrentUser();
      if (!user) return null;
      uid = user.id;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', uid)
      .single();

    if (error) return null;

    return data;
  } catch {
    return null;
  }
}

// Profile helpers
export async function getAllProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('full_name');
  
  return error ? [] : (data || []);
}

export async function getProfileById(id: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single();
  
  return error ? null : data;
}

export async function updateProfile(id: string, updates: Partial<Profile>) {
  const { data, error } = await supabase
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  
  return { data, error };
}

export async function uploadProfilePicture(userId: string, file: File) {
  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}-${Date.now()}.${fileExt}`;
  const filePath = `avatars/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('profiles')
    .upload(filePath, file);

  if (uploadError) return { publicUrl: null, error: uploadError };

  const { data: publicUrlData } = supabase.storage
    .from('profiles')
    .getPublicUrl(filePath);

  const publicUrl = publicUrlData?.publicUrl ?? null;

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ avatar_url: publicUrl })
    .eq('id', userId);

  if (updateError) return { publicUrl: null, error: updateError };

  return { publicUrl, error: null };
}

// Ticket helpers
export async function getAllTickets(): Promise<Ticket[]> {
  const { data, error } = await supabase
    .from('tickets')
    .select('*, profile:profiles(*)')
    .order('created_at', { ascending: false });

  return error ? [] : (data || []);

