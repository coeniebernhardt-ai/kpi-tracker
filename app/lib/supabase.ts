'use client';

import { createClient } from '@supabase/supabase-js';
import { validateUUID, validateEmail, sanitizeInput, validateFileUpload } from './security';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Validate URL format
try {
  new URL(supabaseUrl);
} catch {
  throw new Error('Invalid Supabase URL format');
}

// Create Supabase client with security configurations
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    flowType: 'pkce', // Use PKCE flow for better security
  },
  global: {
    headers: {
      'X-Client-Info': 'kpi-tracker-web',
    },
  },
  db: {
    schema: 'public',
  },
});

// Request interceptor for additional validation
if (typeof window !== 'undefined') {
  // Validate origin on client-side
  const currentOrigin = window.location.origin;
  const allowedOrigins = [
    'https://kpi-tracker-six.vercel.app',
    'https://kpi-tracker.vercel.app',
    'http://localhost:3000',
    'http://localhost:3001',
  ];

  if (!allowedOrigins.includes(currentOrigin)) {
    console.warn('Application running from unauthorized origin:', currentOrigin);
  }
}

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
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
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
  updates?: { text: string; timestamp: string }[];
  time_logs?: { minutes: number; description: string; timestamp: string; logged_by?: string }[];
  total_time_minutes?: number;
  // Joined data
  profile?: Profile;
}

// Auth helpers
export async function signIn(email: string, password: string) {
  // Validate input
  if (!email || !password) {
    return { 
      data: null, 
      error: { message: 'Email and password are required' } as Error 
    };
  }

  // Validate email format
  if (!validateEmail(email)) {
    return { 
      data: null, 
      error: { message: 'Invalid email format' } as Error 
    };
  }

  // Sanitize email
  const sanitizedEmail = sanitizeInput(email.trim().toLowerCase());

  const { data, error } = await supabase.auth.signInWithPassword({
    email: sanitizedEmail,
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
        return null;
      }
      uid = user.id;
    }

    // Validate UUID format
    if (!validateUUID(uid)) {
      console.error('getCurrentProfile: Invalid user ID format');
      return null;
    }

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
  // Validate user ID
  if (!validateUUID(userId)) {
    return { 
      publicUrl: null, 
      error: new Error('Invalid user ID format') 
    };
  }

  // Validate file upload
  const fileValidation = validateFileUpload(file, {
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  });

  if (!fileValidation.valid) {
    return { 
      publicUrl: null, 
      error: new Error(fileValidation.error || 'Invalid file') 
    };
  }

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
  // Validate ticket ID
  if (!validateUUID(ticketId)) {
    return { 
      url: null, 
      error: new Error('Invalid ticket ID format') 
    };
  }

  // Validate file type parameter
  if (!['attachment', 'site_file'].includes(fileType)) {
    return { 
      url: null, 
      error: new Error('Invalid file type') 
    };
  }

  // Validate file upload
  const maxSize = fileType === 'site_file' ? 10 * 1024 * 1024 : 5 * 1024 * 1024; // 10MB for site files, 5MB for attachments
  const allowedTypes = fileType === 'site_file' 
    ? ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    : ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

  const fileValidation = validateFileUpload(file, {
    maxSize,
    allowedTypes,
  });

  if (!fileValidation.valid) {
    return { 
      url: null, 
      error: new Error(fileValidation.error || 'Invalid file') 
    };
  }

  // Sanitize label if provided
  const sanitizedLabel = label ? sanitizeInput(label.trim()) : undefined;

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
    
    // Ensure time_logs is always an array for existing tickets
    const normalizedData = (data || []).map(ticket => ({
      ...ticket,
      time_logs: Array.isArray(ticket.time_logs) ? ticket.time_logs : [],
      updates: Array.isArray(ticket.updates) ? ticket.updates : [],
      total_time_minutes: ticket.total_time_minutes || 0
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
      .select('*')
      .eq('user_id', userId)
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
    
    // Ensure time_logs is always an array for existing tickets
    const normalizedData = (data || []).map(ticket => ({
      ...ticket,
      time_logs: Array.isArray(ticket.time_logs) ? ticket.time_logs : [],
      updates: Array.isArray(ticket.updates) ? ticket.updates : [],
      total_time_minutes: ticket.total_time_minutes || 0
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
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
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
}): Promise<{ data: Ticket | null; error: Error | null }> {
  // Validate required fields
  if (!ticket.user_id || !ticket.client || !ticket.issue) {
    return { 
      data: null, 
      error: new Error('Missing required fields: user_id, client, and issue are required') 
    };
  }

  // Validate UUID format
  if (!validateUUID(ticket.user_id)) {
    return { 
      data: null, 
      error: new Error('Invalid user ID format') 
    };
  }

  if (ticket.created_by && !validateUUID(ticket.created_by)) {
    return { 
      data: null, 
      error: new Error('Invalid created_by ID format') 
    };
  }

  // Validate and sanitize text fields
  const sanitizedClient = sanitizeInput(ticket.client.trim());
  const sanitizedIssue = sanitizeInput(ticket.issue.trim());
  
  if (sanitizedClient.length === 0 || sanitizedIssue.length === 0) {
    return { 
      data: null, 
      error: new Error('Client and issue cannot be empty') 
    };
  }

  if (sanitizedIssue.length > 5000) {
    return { 
      data: null, 
      error: new Error('Issue description is too long (max 5000 characters)') 
    };
  }

  // Validate location
  if (!['on-site', 'remote'].includes(ticket.location)) {
    return { 
      data: null, 
      error: new Error('Invalid location value') 
    };
  }

  // Validate ticket type if provided
  if (ticket.ticket_type && !['Hardware', 'Software', 'New Site'].includes(ticket.ticket_type)) {
    return { 
      data: null, 
      error: new Error('Invalid ticket type') 
    };
  }

  // Validate severity if provided
  if (ticket.severity && !['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(ticket.severity)) {
    return { 
      data: null, 
      error: new Error('Invalid severity value') 
    };
  }

  // Sanitize optional fields
  const sanitizedTicket = {
    ...ticket,
    client: sanitizedClient,
    issue: sanitizedIssue,
    clickup_ticket: ticket.clickup_ticket ? sanitizeInput(ticket.clickup_ticket.trim()) : undefined,
    estate_or_building: ticket.estate_or_building ? sanitizeInput(ticket.estate_or_building.trim()) : undefined,
    cml_location: ticket.cml_location ? sanitizeInput(ticket.cml_location.trim()) : undefined,
    site_name: ticket.site_name ? sanitizeInput(ticket.site_name.trim()) : undefined,
    dependency_name: ticket.dependency_name ? sanitizeInput(ticket.dependency_name.trim()) : undefined,
  };

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
      ...sanitizedTicket,
      ticket_number: ticketNumber,
      status: 'open',
      updates: [],
      time_logs: [initialTimeLog],
      total_time_minutes: 0,
      installers: sanitizedTicket.installers || [],
      dependencies: sanitizedTicket.dependencies || [],
      site_files: sanitizedTicket.site_files || [],
      attachments: sanitizedTicket.attachments || [],
    })
    .select()
    .single();

  return { data, error: error as Error | null };
}

export async function updateTicket(ticketId: string, updates: Partial<Ticket>) {
  // Validate ticket ID
  if (!validateUUID(ticketId)) {
    return { 
      data: null, 
      error: { message: 'Invalid ticket ID format' } as Error 
    };
  }

  // Sanitize text fields in updates
  const sanitizedUpdates: Partial<Ticket> = { ...updates };
  
  if (sanitizedUpdates.issue) {
    sanitizedUpdates.issue = sanitizeInput(sanitizedUpdates.issue.trim());
    if (sanitizedUpdates.issue.length === 0) {
      return { 
        data: null, 
        error: { message: 'Issue cannot be empty' } as Error 
      };
    }
  }

  if (sanitizedUpdates.resolution) {
    sanitizedUpdates.resolution = sanitizeInput(sanitizedUpdates.resolution.trim());
  }

  if (sanitizedUpdates.client) {
    sanitizedUpdates.client = sanitizeInput(sanitizedUpdates.client.trim());
  }

  if (sanitizedUpdates.estate_or_building) {
    sanitizedUpdates.estate_or_building = sanitizeInput(sanitizedUpdates.estate_or_building.trim());
  }

  if (sanitizedUpdates.cml_location) {
    sanitizedUpdates.cml_location = sanitizeInput(sanitizedUpdates.cml_location.trim());
  }

  if (sanitizedUpdates.site_name) {
    sanitizedUpdates.site_name = sanitizeInput(sanitizedUpdates.site_name.trim());
  }

  const { data, error } = await supabase
    .from('tickets')
    .update(sanitizedUpdates)
    .eq('id', ticketId)
    .select()
    .single();

  return { data, error };
}

export async function closeTicket(ticketId: string, resolution: string) {
  // Validate ticket ID
  if (!validateUUID(ticketId)) {
    return { 
      data: null, 
      error: { message: 'Invalid ticket ID format' } as Error 
    };
  }

  // Validate and sanitize resolution
  if (!resolution || resolution.trim().length === 0) {
    return { 
      data: null, 
      error: { message: 'Resolution is required' } as Error 
    };
  }

  const sanitizedResolution = sanitizeInput(resolution.trim());
  
  if (sanitizedResolution.length > 2000) {
    return { 
      data: null, 
      error: { message: 'Resolution is too long (max 2000 characters)' } as Error 
    };
  }
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
      resolution: sanitizedResolution,
      response_time_minutes: responseTimeMinutes,
      closed_at: closedAt.toISOString(),
    })
    .eq('id', ticketId)
    .select()
    .single();

  return { data, error };
}

export async function deleteTicket(ticketId: string) {
  // Validate ticket ID
  if (!validateUUID(ticketId)) {
    return { 
      error: { message: 'Invalid ticket ID format' } as Error 
    };
  }

  const { error } = await supabase
    .from('tickets')
    .delete()
    .eq('id', ticketId);
  
  return { error };
}

export async function addTicketUpdate(ticketId: string, updateText: string, loggedBy?: string) {
  // Validate ticket ID
  if (!validateUUID(ticketId)) {
    return { 
      data: null, 
      error: { message: 'Invalid ticket ID format' } as Error 
    };
  }

  // Validate and sanitize update text
  if (!updateText || updateText.trim().length === 0) {
    return { 
      data: null, 
      error: { message: 'Update text is required' } as Error 
    };
  }

  const sanitizedUpdateText = sanitizeInput(updateText.trim());
  
  if (sanitizedUpdateText.length > 2000) {
    return { 
      data: null, 
      error: { message: 'Update text is too long (max 2000 characters)' } as Error 
    };
  }

  // Sanitize loggedBy if provided
  const sanitizedLoggedBy = loggedBy ? sanitizeInput(loggedBy.trim()) : undefined;
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
  const newUpdate = {
    text: updateText,
    timestamp: now.toISOString()
  };

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
      description: `Time tracked for update: "${sanitizedUpdateText.substring(0, 50)}${sanitizedUpdateText.length > 50 ? '...' : ''}"`,
      timestamp: now.toISOString(),
      logged_by: sanitizedLoggedBy || 'System'
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
  // Validate ticket ID
  if (!validateUUID(ticketId)) {
    return { 
      data: null, 
      error: { message: 'Invalid ticket ID format' } as Error 
    };
  }

  // Validate minutes
  if (typeof minutes !== 'number' || minutes < 0 || minutes > 1440) {
    return { 
      data: null, 
      error: { message: 'Invalid time value (must be between 0 and 1440 minutes)' } as Error 
    };
  }

  // Validate and sanitize description
  if (!description || description.trim().length === 0) {
    return { 
      data: null, 
      error: { message: 'Description is required' } as Error 
    };
  }

  const sanitizedDescription = sanitizeInput(description.trim());
  const sanitizedLoggedBy = loggedBy ? sanitizeInput(loggedBy.trim()) : undefined;

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
    logged_by: sanitizedLoggedBy
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
