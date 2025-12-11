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
  updates?: { text: string; timestamp: string; attachments?: { url: string; name: string; type: string }[] }[];
  time_logs?: { minutes: number; description: string; timestamp: string; logged_by?: string }[];
  total_time_minutes?: number;
  // Assignment (can have multiple assigned members)
  assigned_to?: string[] | null;
  assigned_profiles?: Profile[];
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
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/login`,
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
      .select('*, profile:profiles!user_id(*), assigned_profile:profiles!assigned_to(*)')
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
        assigned_to: assignedIds,
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

export async function updateTicket(ticketId: string, updates: Partial<Ticket>) {
  // Only include fields that should be updated, exclude joined data
  const updateData: any = { ...updates };
  delete updateData.profile;
  delete updateData.assigned_profile;

  const { data, error } = await supabase
    .from('tickets')
    .update(updateData)
    .eq('id', ticketId)
    .select('*, profile:profiles!user_id(*), assigned_profile:profiles!assigned_to(*)')
    .single();

  return { data, error };
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
