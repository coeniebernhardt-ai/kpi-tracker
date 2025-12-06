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
  // Joined data
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
      if (!user) {
        console.log('getCurrentProfile: No user found');
        return null;
      }
      uid = user.id;
    }

    console.log('getCurrentProfile: Fetching profile for user', uid);

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', uid)
      .single();

    if (error) {
      console.error('getCurrentProfile: Error:', error.message);
      return null;
    }

    return data;
  } catch (err) {
    console.error('getCurrentProfile: Exception:', err);
    return null;
  }
}

// Profile helpers
export async function getAllProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('full_name');
  
  if (error) {
    console.error('Error fetching profiles:', error);
    return [];
  }
  
  return data || [];
}

export async function getProfileById(id: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) {
    console.error('Error fetching profile:', error);
    return null;
  }
  
  return data;
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

export async function uploadProfilePicture(userId: string, file: File): Promise<{ publicUrl: string | null; error: Error | null }> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}-${Date.now()}.${fileExt}`;
  const filePath = `avatars/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('profiles')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) {
    console.error('Error uploading file:', uploadError);
    return { publicUrl: null, error: uploadError };
  }

  const { data: publicUrlData } = supabase.storage
    .from('profiles')
    .getPublicUrl(filePath);

  if (!publicUrlData || !publicUrlData.publicUrl) {
    return { publicUrl: null, error: new Error('Could not get public URL for uploaded file.') };
  }

  // Update profile with new avatar_url
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ avatar_url: publicUrlData.publicUrl })
    .eq('id', userId);

  if (updateError) {
    console.error('Error updating profile with avatar URL:', updateError);
    return { publicUrl: null, error: updateError };
  }

  return { publicUrl: publicUrlData.publicUrl, error: null };
}

// Ticket helpers
export async function getAllTickets(): Promise<Ticket[]> {
  const { data, error } = await supabase
    .from('tickets')
    .select('*, profile:profiles(*)')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching tickets:', error);
    return [];
  }
  
  return data || [];
}

export async function getTicketsByUserId(userId: string): Promise<Ticket[]> {
  const { data, error } = await supabase
    .from('tickets')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching user tickets:', error);
    return [];
  }
  
  return data || [];
}

export async function createTicket(ticket: {
  user_id: string;
  client: string;
  clickup_ticket?: string;
  location: 'on-site' | 'remote';
  issue: string;
  created_by?: string;
  has_dependencies?: boolean;
  dependency_name?: string;
  ticket_type?: 'Hardware' | 'Software';
  estate_or_building?: string;
  cml_location?: string;
}): Promise<{ data: Ticket | null; error: Error | null }> {
  // Generate ticket number
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  
  // Get user's initials from profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', ticket.user_id)
    .single();
  
  const initials = profile?.full_name
    ? profile.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase()
    : 'XX';
  
  // Get count of tickets for this user today
  const { count } = await supabase
    .from('tickets')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', ticket.user_id)
    .gte('created_at', today.toISOString().slice(0, 10));
  
  const seq = String((count || 0) + 1).padStart(3, '0');
  const ticketNumber = `${initials}-${dateStr}-${seq}`;

  const { data, error } = await supabase
    .from('tickets')
    .insert({
      ...ticket,
      ticket_number: ticketNumber,
      status: 'open',
      updates: [],
      time_logs: [],
      total_time_minutes: 0,
    })
    .select()
    .single();

  return { data, error: error as Error | null };
}

export async function closeTicket(ticketId: string, resolution: string) {
  // Get the ticket to calculate response time
  const { data: ticket, error: fetchError } = await supabase
    .from('tickets')
    .select('created_at')
    .eq('id', ticketId)
    .single();

  if (fetchError || !ticket) {
    console.error('Error fetching ticket:', fetchError);
    return { data: null, error: fetchError };
  }

  // Calculate response time in minutes
  const createdAt = new Date(ticket.created_at);
  const closedAt = new Date();
  const responseTimeMinutes = Math.round((closedAt.getTime() - createdAt.getTime()) / (1000 * 60));

  const { data, error } = await supabase
    .from('tickets')
    .update({
      status: 'closed',
      resolution,
      response_time_minutes: responseTimeMinutes,
      closed_at: closedAt.toISOString(),
    })
    .eq('id', ticketId)
    .select()
    .single();

  return { data, error };
}

export async function deleteTicket(ticketId: string) {
  const { error } = await supabase
    .from('tickets')
    .delete()
    .eq('id', ticketId);

  return { error };
}

export async function addTicketUpdate(ticketId: string, updateText: string) {
  // First get the current ticket to get existing updates
  const { data: ticket, error: fetchError } = await supabase
    .from('tickets')
    .select('updates')
    .eq('id', ticketId)
    .single();

  if (fetchError) {
    return { data: null, error: fetchError };
  }

  // Create new update with timestamp
  const newUpdate = {
    text: updateText,
    timestamp: new Date().toISOString()
  };

  // Append to existing updates or create new array
  const existingUpdates = ticket?.updates || [];
  const updatedUpdates = [...existingUpdates, newUpdate];

  // Update the ticket
  const { data, error } = await supabase
    .from('tickets')
    .update({ updates: updatedUpdates })
    .eq('id', ticketId)
    .select()
    .single();

  return { data, error };
}

export async function logTicketTime(ticketId: string, minutes: number, description: string, loggedBy?: string) {
  // First get the current ticket to get existing time logs
  const { data: ticket, error: fetchError } = await supabase
    .from('tickets')
    .select('time_logs, total_time_minutes')
    .eq('id', ticketId)
    .single();

  if (fetchError) {
    return { data: null, error: fetchError };
  }

  // Create new time log entry
  const newTimeLog = {
    minutes,
    description,
    timestamp: new Date().toISOString(),
    logged_by: loggedBy
  };

  // Append to existing time logs or create new array
  const existingLogs = ticket?.time_logs || [];
  const updatedLogs = [...existingLogs, newTimeLog];

  // Calculate total time
  const totalTime = updatedLogs.reduce((sum: number, log: { minutes: number }) => sum + log.minutes, 0);

  // Update the ticket
  const { data, error } = await supabase
    .from('tickets')
    .update({ 
      time_logs: updatedLogs,
      total_time_minutes: totalTime
    })
    .eq('id', ticketId)
    .select()
    .single();

  return { data, error };
}
