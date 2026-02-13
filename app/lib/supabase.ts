import { createClient, type SupabaseClient } from '@supabase/supabase-js';

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
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  issue: string;
  resolution?: string;
  response_time_minutes?: number;
  created_at: string;
  closed_at?: string;
  created_by?: string;
  has_dependencies?: boolean;
  dependency_name?: string;
  ticket_type?: 'Hardware' | 'Software' | 'New Site';
  estate_or_building?: string;
  cml_location?: string;
  // New Site fields
  site_name?: string;
  installers?: string[];
  site_files?: { url: string; name: string; type: string; label?: string }[];
  dependencies?: string[];
  target_date?: string;
  // Attachments for regular tickets
  attachments?: { url: string; name: string; type: string }[];
  updates?: { text: string; timestamp: string; attachments?: { url: string; name: string; type: string }[]; authorRole?: 'admin'; authorId?: string }[];
  time_logs?: { minutes: number; description: string; timestamp: string; logged_by?: string }[];
  total_time_minutes?: number;
  // Assignment (can have multiple assigned members)
  assigned_to?: string[] | null;
  assigned_profiles?: Profile[];
  // Joined data
  profile?: Profile;
}

// FEATURE C: Notifications (member-only; admin/member triggers create these)
// FEATURE A: admin_broadcast added for admin push notifications (optional title, message, image_url)
export type NotificationType = 'admin_comment' | 'added_to_ticket' | 'admin_broadcast';
export type TriggeringUserRole = 'admin' | 'member';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  ticket_id?: string | null;
  triggering_user_role: TriggeringUserRole;
  triggering_user_id?: string | null;
  created_at: string;
  read: boolean;
  /** Set when marked read; for analytics */
  read_at?: string | null;
  /** FEATURE A: Optional for admin_broadcast */
  title?: string | null;
  message?: string | null;
  image_url?: string | null;
  /** Groups notifications from one admin send */
  broadcast_group_id?: string | null;
  /** Set by detail API from profiles (sender name) */
  sender_name?: string | null;
  /** Resolvable image URL (proxy path) returned by detail API only */
  imageUrl?: string | null;
  /** Attachments (secure download via /api/notifications/attachment/[id]); returned by detail API only */
  attachments?: Array<{ id: string; fileName: string; fileType: string; fileSize: number }>;
  /** Soft delete; hidden from members when set (RLS + client filter) */
  deleted_at?: string | null;
}

// Auth helpers
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
}

// SECURITY: Public sign-ups are disabled - only admins can create accounts
// This function is kept for admin use only (not exposed in UI)
export async function signUp(email: string, password: string, fullName: string, role: string) {
  // Additional security: This should only be called from admin context
  // In production, consider adding server-side API route protection
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
  // Use production Vercel URL for password reset emails
  // This ensures reset links work in production, not just localhost/preview
  const productionUrl = 'https://kpi-tracker-six.vercel.app';
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${productionUrl}/reset-password`,
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
  // Use consistent filename to allow overwriting
  const fileName = `${userId}.${fileExt}`;
  const filePath = `avatars/${fileName}`;

  // First, try to delete the old file if it exists
  const { data: existingFiles } = await supabase.storage
    .from('profiles')
    .list('avatars', {
      search: userId
    });

  if (existingFiles && existingFiles.length > 0) {
    // Delete old avatar files for this user
    const filesToDelete = existingFiles
      .filter(f => f.name.startsWith(userId))
      .map(f => `avatars/${f.name}`);
    
    if (filesToDelete.length > 0) {
      await supabase.storage
        .from('profiles')
        .remove(filesToDelete);
    }
  }

  // Upload the new file (upsert allows overwriting)
  const { error: uploadError } = await supabase.storage
    .from('profiles')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true,
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

// Upload ticket attachments (images/files)
export async function uploadTicketAttachment(
  ticketId: string,
  file: File,
  fileType: 'attachment' | 'site_file',
  label?: string
): Promise<{ url: string | null; error: Error | null }> {
  const fileExt = file.name.split('.').pop();
  const timestamp = Date.now();
  const fileName = `${ticketId}-${timestamp}.${fileExt}`;
  const folder = fileType === 'site_file' ? 'site-files' : 'attachments';
  const filePath = `${folder}/${fileName}`;

  // Upload the file
  const { error: uploadError } = await supabase.storage
    .from('tickets')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) {
    console.error('Error uploading ticket file:', uploadError);
    return { url: null, error: uploadError };
  }

  const { data: publicUrlData } = supabase.storage
    .from('tickets')
    .getPublicUrl(filePath);

  if (!publicUrlData || !publicUrlData.publicUrl) {
    return { url: null, error: new Error('Could not get public URL for uploaded file.') };
  }

  return {
    url: publicUrlData.publicUrl,
    error: null
  };
}

// Ticket helpers
export async function getAllTickets(): Promise<Ticket[]> {
  try {
    const { data, error } = await supabase
      .from('tickets')
      .select('*, profile:profiles!user_id(*)')
      .order('created_at', { ascending: false });
    
    if (error) {
      // Log error details in a way that's visible in the console
      const errorInfo = `Error fetching tickets: ${error.message || 'Unknown error'} (Code: ${error.code || 'NO_CODE'})`;
      console.error(errorInfo);
      
      // Log structured error for debugging
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      
      // Also log to help debug RLS issues
      if (error.code === 'PGRST116' || error.message?.includes('permission') || error.message?.includes('policy')) {
        console.error('⚠️ This might be an RLS (Row Level Security) policy issue. Check your Supabase RLS policies.');
        console.error('Make sure your user profile has is_admin = TRUE in the profiles table.');
      }
      
      return [];
    }
    
    // Normalize data and fetch assigned profiles
    const normalizedData = await Promise.all((data || []).map(async (ticket: any) => {
      let assignedProfiles: Profile[] = [];
      
      // Handle both old single assigned_to and new assigned_to_array
      const assignedIds = ticket.assigned_to_array || (ticket.assigned_to ? (Array.isArray(ticket.assigned_to) ? ticket.assigned_to : [ticket.assigned_to]) : []);
      
      if (assignedIds.length > 0 && Array.isArray(assignedIds)) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('*')
          .in('id', assignedIds.filter((id: any) => id != null));
        assignedProfiles = profiles || [];
      }
      
      return {
        ...ticket,
        assigned_to: assignedIds || [],
        assigned_profiles: assignedProfiles,
        time_logs: Array.isArray(ticket.time_logs) ? ticket.time_logs : [],
        updates: Array.isArray(ticket.updates) ? ticket.updates : [],
        total_time_minutes: ticket.total_time_minutes || 0
      };
    }));
    
    return normalizedData;
  } catch (err: any) {
    console.error('Exception in getAllTickets:', err);
    console.error('Exception details:', err?.message, err?.stack);
    return [];
  }
}

export async function getTicketsByUserId(userId: string): Promise<Ticket[]> {
  try {
    const { data, error } = await supabase
      .from('tickets')
      .select('*, profile:profiles!user_id(*)')
      .or(`user_id.eq.${userId},assigned_to_array.cs.{${userId}}`)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching user tickets:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        fullError: error
      });
      return [];
    }
    
    // Normalize data and fetch assigned profiles
    const normalizedData = await Promise.all((data || []).map(async (ticket) => {
      let assignedProfiles: Profile[] = [];
      
      // Handle both old single assigned_to and new assigned_to_array
      const assignedIds = ticket.assigned_to_array || (ticket.assigned_to ? [ticket.assigned_to] : []);
      
      if (assignedIds.length > 0 && Array.isArray(assignedIds)) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('*')
          .in('id', assignedIds.filter(id => id != null));
        assignedProfiles = profiles || [];
      }
      
      return {
        ...ticket,
        assigned_to: assignedIds,
        assigned_profiles: assignedProfiles,
        time_logs: Array.isArray(ticket.time_logs) ? ticket.time_logs : [],
        updates: Array.isArray(ticket.updates) ? ticket.updates : [],
        total_time_minutes: ticket.total_time_minutes || 0
      };
    }));
    
    return normalizedData;
  } catch (err) {
    console.error('Exception in getTicketsByUserId:', err);
    return [];
  }
}

export async function createTicket(ticket: {
  user_id: string;
  client: string;
  clickup_ticket?: string;
  location: 'on-site' | 'remote';
  issue: string;
  created_by?: string;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  has_dependencies?: boolean;
  dependency_name?: string;
  ticket_type?: 'Hardware' | 'Software' | 'New Site';
  estate_or_building?: string;
  cml_location?: string;
  // New Site fields
  site_name?: string;
  installers?: string[];
  site_files?: { url: string; name: string; type: string; label?: string }[];
  dependencies?: string[];
  target_date?: string;
  // Attachments for regular tickets
  attachments?: { url: string; name: string; type: string }[];
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

  const now = new Date();
  
  // Initialize with a time log entry for ticket creation
  const initialTimeLog = {
    minutes: 0, // Will be calculated on first update
    description: 'Ticket opened',
    timestamp: now.toISOString(),
    logged_by: 'System'
  };

  const { data, error } = await supabase
    .from('tickets')
    .insert({
      ...ticket,
      ticket_number: ticketNumber,
      status: 'open',
      severity: ticket.severity || 'MEDIUM', // Default to MEDIUM if not provided
      updates: [],
      time_logs: [initialTimeLog],
      total_time_minutes: 0,
      installers: ticket.installers || [],
      dependencies: ticket.dependencies || [],
      site_files: ticket.site_files || [],
      attachments: ticket.attachments || [],
    })
    .select()
    .single();

  return { data, error: error as Error | null };
}

/** Parse existing dependency_name into a list (comma-separated or single value). Backward-compatible. */
function parseDependencyList(dependencyName: string | null | undefined): string[] {
  if (!dependencyName || typeof dependencyName !== 'string') return [];
  return dependencyName.split(',').map((s) => s.trim()).filter(Boolean);
}

/** Merge a new dependency into existing list; dedupe; return comma-separated string. */
function mergeDependencies(existing: string | null | undefined, newValue: string): string {
  const list = parseDependencyList(existing);
  const trimmed = newValue.trim();
  if (!trimmed) return list.join(', ');
  if (list.map((s) => s.toLowerCase()).includes(trimmed.toLowerCase())) return list.join(', ');
  return [...list, trimmed].join(', ');
}

export async function updateTicket(ticketId: string, updates: Partial<Ticket>) {
  // Only include fields that should be updated, exclude joined data
  const updateData: any = { ...updates };
  delete updateData.profile;
  delete updateData.assigned_profiles;

  // FEATURE 2: Merge dependencies instead of overwriting. Fetch current ticket when dependency_name is being updated.
  if ('dependency_name' in updateData && updateData.dependency_name != null && String(updateData.dependency_name).trim() !== '') {
    const { data: current } = await supabase.from('tickets').select('dependency_name').eq('id', ticketId).maybeSingle();
    const merged = mergeDependencies((current as any)?.dependency_name, String(updateData.dependency_name));
    updateData.dependency_name = merged;
    updateData.has_dependencies = true;
  }

  // Convert assigned_to array to the database column name (assigned_to_array)
  if ('assigned_to' in updateData) {
    // Ensure it's a proper array (not null/undefined)
    const assignedArray = updateData.assigned_to || [];
    // Set the database column name
    updateData.assigned_to_array = Array.isArray(assignedArray) ? assignedArray : [];
    // Remove the TypeScript field name
    delete updateData.assigned_to;
  }

  // First, perform the update without select to avoid RLS issues with .single()
  const { error: updateError } = await supabase
    .from('tickets')
    .update(updateData)
    .eq('id', ticketId);

  if (updateError) {
    console.error('Error updating ticket:', updateError);
    return { data: null, error: updateError };
  }

  // Then fetch the updated ticket separately (this respects RLS and avoids .single() issues)
  const { data: updatedTicket, error: fetchError } = await supabase
    .from('tickets')
    .select('*, profile:profiles!user_id(*)')
    .eq('id', ticketId)
    .maybeSingle(); // Use maybeSingle() instead of single() to handle 0 rows gracefully

  if (fetchError) {
    console.error('Error fetching updated ticket:', fetchError);
    return { data: null, error: fetchError };
  }

  if (!updatedTicket) {
    // Ticket might not exist or RLS is preventing access - return error
    return { 
      data: null, 
      error: { 
        message: 'Ticket not found or access denied', 
        code: 'PGRST116',
        details: 'The result contains 0 rows',
        hint: null
      } as any 
    };
  }

  // Fetch assigned profiles separately if assigned_to_array exists
  let assignedProfiles: Profile[] = [];
  if ((updatedTicket as any).assigned_to_array && Array.isArray((updatedTicket as any).assigned_to_array) && (updatedTicket as any).assigned_to_array.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .in('id', (updatedTicket as any).assigned_to_array);
    
    assignedProfiles = profiles || [];
  }

  return { 
    data: { 
      ...updatedTicket, 
      assigned_to: (updatedTicket as any).assigned_to_array || [],
      assigned_profiles: assignedProfiles
    }, 
    error: null 
  };
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
  try {
    const { data, error } = await supabase
      .from('tickets')
      .delete()
      .eq('id', ticketId)
      .select(); // Select to verify deletion
    
    if (error) {
      console.error('Error deleting ticket:', {
        ticketId,
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      
      // Check for RLS policy issues
      if (error.code === 'PGRST116' || error.message?.includes('permission') || error.message?.includes('policy')) {
        console.error('⚠️ This might be an RLS (Row Level Security) policy issue. Check your Supabase RLS policies for the tickets table.');
      }
    } else {
      console.log('Ticket deleted successfully:', ticketId, data);
    }
    
    return { data, error };
  } catch (err: any) {
    console.error('Exception in deleteTicket:', err);
    return { data: null, error: err };
  }
}

export async function addTicketUpdate(
  ticketId: string, 
  updateText: string, 
  loggedBy?: string,
  attachments?: { url: string; name: string; type: string }[]
) {
  // Get the current ticket with all necessary fields
  const { data: ticket, error: fetchError } = await supabase
    .from('tickets')
    .select('created_at, updates, time_logs, total_time_minutes')
    .eq('id', ticketId)
    .single();

  if (fetchError) {
    return { data: null, error: fetchError };
  }

  const now = new Date();
  const newUpdate: any = {
    text: updateText,
    timestamp: now.toISOString()
  };
  
  // Add attachments if provided
  if (attachments && attachments.length > 0) {
    newUpdate.attachments = attachments;
  }

  // Append to existing updates or create new array
  const existingUpdates = ticket?.updates || [];
  const updatedUpdates = [...existingUpdates, newUpdate];

  // Auto-calculate time since last update (or ticket creation if first update)
  let timeMinutes = 0;
  const createdAt = new Date(ticket.created_at);
  
  if (existingUpdates.length > 0) {
    // Calculate time since last update
    const lastUpdate = existingUpdates[existingUpdates.length - 1];
    const lastUpdateTime = new Date(lastUpdate.timestamp);
    timeMinutes = Math.round((now.getTime() - lastUpdateTime.getTime()) / (1000 * 60));
  } else {
    // First update - calculate time since ticket creation
    timeMinutes = Math.round((now.getTime() - createdAt.getTime()) / (1000 * 60));
  }

  // Always log time (even if 0, to track continuous time)
  const existingLogs = ticket?.time_logs || [];
  let updatedLogs = existingLogs;
  
  // If this is the first update and we have the initial "Ticket opened" log, update it with the time
  if (existingUpdates.length === 0 && existingLogs.length > 0 && existingLogs[0].description === 'Ticket opened' && existingLogs[0].minutes === 0) {
    // Update the initial log with the actual time from creation to first update
    updatedLogs = [
      {
        ...existingLogs[0],
        minutes: timeMinutes,
        description: `Time from ticket creation to first update`
      }
    ];
  } else if (timeMinutes > 0) {
    // Add new time log entry for this update
    const newTimeLog = {
      minutes: timeMinutes,
      description: `Time tracked for update: "${updateText.substring(0, 50)}${updateText.length > 50 ? '...' : ''}"`,
      timestamp: now.toISOString(),
      logged_by: loggedBy || 'System'
    };
    updatedLogs = [...existingLogs, newTimeLog];
  }
  
  // Calculate total time
  const totalTime = updatedLogs.reduce((sum: number, log: { minutes: number }) => sum + log.minutes, 0);

  // Update the ticket with both updates and time logs
  const { data, error } = await supabase
    .from('tickets')
    .update({ 
      updates: updatedUpdates,
      time_logs: updatedLogs.length > 0 ? updatedLogs : [],
      total_time_minutes: totalTime
    })
    .eq('id', ticketId)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating ticket with time logs:', error.message || error.code || error);
  }

  return { data, error };
}

/**
 * FEATURE 3: Add an admin-only comment to a ticket. Stored in updates with authorRole 'admin'.
 * Does not change ticket ownership or status. Only admins should call this (enforce in UI).
 */
export async function addTicketAdminComment(
  ticketId: string,
  text: string,
  authorId: string
): Promise<{ data: unknown; error: Error | null }> {
  const { data: ticket, error: fetchError } = await supabase
    .from('tickets')
    .select('updates')
    .eq('id', ticketId)
    .single();

  if (fetchError || !ticket) {
    return { data: null, error: (fetchError || new Error('Ticket not found')) as Error };
  }

  const now = new Date().toISOString();
  const existingUpdates = Array.isArray((ticket as any).updates) ? (ticket as any).updates : [];
  const newEntry = {
    text: text.trim(),
    timestamp: now,
    authorRole: 'admin' as const,
    authorId,
  };
  const updatedUpdates = [...existingUpdates, newEntry];

  const { data, error } = await supabase
    .from('tickets')
    .update({ updates: updatedUpdates })
    .eq('id', ticketId)
    .select()
    .single();

  if (error) return { data, error: error as Error | null };

  // FEATURE C: Notify all involved members (creator + assignees) except the admin who commented.
  const { data: ticketRow } = await supabase
    .from('tickets')
    .select('user_id, assigned_to_array')
    .eq('id', ticketId)
    .single();
  if (ticketRow) {
    const creatorId = (ticketRow as any).user_id;
    const assignees: string[] = Array.isArray((ticketRow as any).assigned_to_array) ? (ticketRow as any).assigned_to_array : [];
    const involved = [...new Set([creatorId, ...assignees].filter(Boolean))];
    for (const uid of involved) {
      if (uid === authorId) continue; // Do not notify the actor
      await createNotification({
        user_id: uid,
        type: 'admin_comment',
        ticket_id: ticketId,
        triggering_user_role: 'admin',
        triggering_user_id: authorId,
      });
    }
  }

  return { data, error: null };
}

/** FEATURE C: Internal helper to insert one notification (append-only). */
/** FEATURE A: Supports admin_broadcast with optional ticket_id, title, message, image_url, broadcast_group_id. */
async function createNotification(notification: {
  user_id: string;
  type: NotificationType;
  ticket_id?: string | null;
  triggering_user_role: TriggeringUserRole;
  triggering_user_id?: string | null;
  title?: string | null;
  message?: string | null;
  image_url?: string | null;
  broadcast_group_id?: string | null;
}): Promise<void> {
  const row: Record<string, unknown> = {
    user_id: notification.user_id,
    type: notification.type,
    ticket_id: notification.ticket_id ?? null,
    triggering_user_role: notification.triggering_user_role,
    triggering_user_id: notification.triggering_user_id ?? null,
    read: false,
  };
  if (notification.title != null) row.title = notification.title;
  if (notification.message != null) row.message = notification.message;
  if (notification.image_url != null) row.image_url = notification.image_url;
  if (notification.broadcast_group_id != null) row.broadcast_group_id = notification.broadcast_group_id;
  await supabase.from('notifications').insert(row);
}

/**
 * FEATURE A: Send admin broadcast to selected recipients. One notification per recipient.
 * broadcastGroupId groups all rows from this send for admin history and analytics.
 */
export async function sendAdminBroadcast(
  adminUserId: string,
  payload: { title?: string; message: string; image_url?: string | null },
  recipientUserIds: string[]
): Promise<{ sent: number; broadcastGroupId: string | null; error: Error | null }> {
  const deduped = [...new Set(recipientUserIds)].filter((id) => id !== adminUserId);
  const broadcastGroupId = deduped.length > 0 ? crypto.randomUUID() : null;
  for (const userId of deduped) {
    await createNotification({
      user_id: userId,
      type: 'admin_broadcast',
      ticket_id: null,
      triggering_user_role: 'admin',
      triggering_user_id: adminUserId,
      title: payload.title ?? null,
      message: payload.message,
      image_url: payload.image_url ?? null,
      broadcast_group_id: broadcastGroupId,
    });
  }
  return { sent: deduped.length, broadcastGroupId, error: null };
}

/** FEATURE C: Create one notification per newly assigned user (excludes actor). Call after updateTicket(assigned_to). */
export async function createNotificationsForNewAssignments(
  ticketId: string,
  previousAssignedIds: string[],
  newAssignedIds: string[],
  actorUserId: string,
  actorRole: TriggeringUserRole
): Promise<void> {
  const prev = new Set(previousAssignedIds);
  const added = newAssignedIds.filter((id) => !prev.has(id) && id !== actorUserId);
  for (const userId of added) {
    await createNotification({
      user_id: userId,
      type: 'added_to_ticket',
      ticket_id: ticketId,
      triggering_user_role: actorRole,
      triggering_user_id: actorUserId,
    });
  }
}

/**
 * Member notification list: dropdown and polling both use this.
 * MUST filter: user_id = recipient AND deleted_at IS NULL so deleted notifications never appear.
 * RLS on notifications also enforces deleted_at IS NULL for SELECT (run FIX_RLS_HIDE_DELETED_NOTIFICATIONS.sql).
 */
export async function getNotificationsByUserId(userId: string): Promise<Notification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  if (error) return [];
  const list = (data ?? []) as Notification[];
  return list.filter((n) => !n.deleted_at);
}

export async function markNotificationAsRead(notificationId: string): Promise<{ error: Error | null }> {
  const now = new Date().toISOString();
  const { error } = await supabase.from('notifications').update({ read: true, read_at: now }).eq('id', notificationId);
  return { error: error as Error | null };
}

export async function markAllNotificationsRead(userId: string): Promise<{ error: Error | null }> {
  const { error } = await supabase.from('notifications').update({ read: true }).eq('user_id', userId);
  return { error: error as Error | null };
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

// Travel Log Types
export interface TravelLog {
  id: string;
  user_id: string;
  reason: string;
  start_address?: string;
  end_address?: string;
  is_return_trip?: boolean;
  comments?: string;
  distance_travelled?: number;
  attachments?: { url: string; name: string; type: string }[];
  created_at: string;
  updated_at: string;
  profile?: Profile;
}

// Travel Log Functions
export async function getTravelLogsByUserId(userId: string): Promise<TravelLog[]> {
  try {
    const { data, error } = await supabase
      .from('travel_logs')
      .select('*, profile:profiles!user_id(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching travel logs:', error);
      return [];
    }
    
    return data || [];
  } catch (err) {
    console.error('Exception in getTravelLogsByUserId:', err);
    return [];
  }
}

export async function getAllTravelLogs(): Promise<TravelLog[]> {
  try {
    const { data, error } = await supabase
      .from('travel_logs')
      .select('*, profile:profiles!user_id(*)')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching all travel logs:', error);
      return [];
    }
    
    return data || [];
  } catch (err) {
    console.error('Exception in getAllTravelLogs:', err);
    return [];
  }
}

// --- AI-INSIGHTS ONLY: read-only data access for analytics (all datasets, all dimensions) ---
/** READ-ONLY. Every ticket field that is a categorical, numeric, or temporal dimension; plus issue/resolution for derived issueNature only. */
export type TicketRowForAnalytics = {
  status: string;
  created_at: string;
  closed_at?: string | null;
  response_time_minutes?: number | null;
  has_dependencies?: boolean | null;
  ticket_type?: string | null;
  client?: string | null;
  user_id: string;
  location?: string | null;
  estate_or_building?: string | null;
  cml_location?: string | null;
  assigned_to_array?: string[] | null;
  severity?: string | null;
  created_by?: string | null;
  dependency_name?: string | null;
  /** Unstructured text; used only to derive issueNature (read-only, not stored back). */
  issue?: string | null;
  resolution?: string | null;
};
export async function getAllTicketsForAnalytics(client: SupabaseClient): Promise<TicketRowForAnalytics[]> {
  const { data, error } = await client
    .from('tickets')
    .select('status, created_at, closed_at, response_time_minutes, has_dependencies, ticket_type, client, user_id, location, estate_or_building, cml_location, assigned_to_array, severity, created_by, dependency_name, issue, resolution')
    .order('created_at', { ascending: false });
  if (error) {
    console.error('[Think-Q] getAllTicketsForAnalytics:', error.message);
    return [];
  }
  return (data ?? []) as TicketRowForAnalytics[];
}

/** READ-ONLY. Every travel log field that is a categorical, numeric, or temporal dimension. */
export type TravelRowForAnalytics = {
  created_at: string;
  user_id: string;
  end_address?: string | null;
  start_address?: string | null;
  distance_travelled?: number | null;
  reason?: string | null;
  is_return_trip?: boolean | null;
};
export async function getAllTravelLogsForAnalytics(client: SupabaseClient): Promise<TravelRowForAnalytics[]> {
  const { data, error } = await client
    .from('travel_logs')
    .select('created_at, user_id, end_address, start_address, distance_travelled, reason, is_return_trip')
    .order('created_at', { ascending: false });
  if (error) {
    console.error('[Think-Q] getAllTravelLogsForAnalytics:', error.message);
    return [];
  }
  return (data ?? []) as TravelRowForAnalytics[];
}

/** READ-ONLY. Profile fields for labeling (id, full_name) and for profiles-as-dataset aggregations (role, is_admin, is_active, created_at). */
export type ProfileRowForAnalytics = {
  id: string;
  full_name: string | null;
  role?: string | null;
  is_admin?: boolean | null;
  is_active?: boolean | null;
  created_at?: string | null;
};
export async function getProfilesForAnalytics(client: SupabaseClient): Promise<ProfileRowForAnalytics[]> {
  const { data, error } = await client
    .from('profiles')
    .select('id, full_name, role, is_admin, is_active, created_at')
    .order('full_name');
  if (error) {
    console.error('[Think-Q] getProfilesForAnalytics:', error.message);
    return [];
  }
  return (data ?? []) as ProfileRowForAnalytics[];
}
// --- END AI-INSIGHTS ONLY ---

export async function createTravelLog(travelLog: {
  user_id: string;
  reason: string;
  start_address?: string;
  end_address?: string;
  is_return_trip?: boolean;
  comments?: string;
  distance_travelled?: number;
  attachments?: { url: string; name: string; type: string }[];
}): Promise<{ data: TravelLog | null; error: Error | null }> {
  try {
    // If return trip is checked, double the distance
    let finalDistance = travelLog.distance_travelled;
    if (travelLog.is_return_trip && finalDistance) {
      finalDistance = finalDistance * 2;
    }

    // Build insert object - only include fields that are provided and not undefined
    const insertData: any = {
      user_id: travelLog.user_id,
      reason: travelLog.reason,
      updated_at: new Date().toISOString(),
      // Provide a default value for destination column (required by old schema)
      // Use end_address if available, otherwise a placeholder
      destination: travelLog.end_address || travelLog.start_address || 'Not specified',
    };

    // Only add optional fields if they are provided
    if (travelLog.start_address !== undefined && travelLog.start_address !== null) {
      insertData.start_address = travelLog.start_address;
    }
    if (travelLog.end_address !== undefined && travelLog.end_address !== null) {
      insertData.end_address = travelLog.end_address;
    }
    if (travelLog.is_return_trip !== undefined && travelLog.is_return_trip !== null) {
      insertData.is_return_trip = travelLog.is_return_trip;
    }
    if (travelLog.comments !== undefined && travelLog.comments !== null && travelLog.comments.trim() !== '') {
      insertData.comments = travelLog.comments;
    }
    if (finalDistance !== undefined && finalDistance !== null) {
      insertData.distance_travelled = finalDistance;
    }
    if (travelLog.attachments !== undefined && travelLog.attachments !== null && travelLog.attachments.length > 0) {
      insertData.attachments = travelLog.attachments;
    }

    const { data, error } = await supabase
      .from('travel_logs')
      .insert(insertData)
      .select('*, profile:profiles!user_id(*)')
      .single();
    
    if (error) {
      console.error('Error creating travel log:', error);
      // Check if it's a column missing error (PGRST204 is the PostgREST error code for missing column)
      if (error.code === 'PGRST204' || (error.message?.includes('column') && (error.message?.includes('not found') || error.message?.includes('schema cache')))) {
        return { 
          data: null, 
          error: new Error('Database schema is missing required columns. Please run the SQL migration in your Supabase SQL Editor. See HOW_TO_FIX_TRAVEL_LOGS_ERROR.md for step-by-step instructions.') 
        };
      }
      return { data: null, error: error as Error };
    }
    
    return { data, error: null };
  } catch (err) {
    console.error('Exception in createTravelLog:', err);
    return { data: null, error: err as Error };
  }
}

export async function deleteTravelLog(travelLogId: string): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase
      .from('travel_logs')
      .delete()
      .eq('id', travelLogId);
    
    return { error: error as Error | null };
  } catch (err) {
    console.error('Exception in deleteTravelLog:', err);
    return { error: err as Error };
  }
}
