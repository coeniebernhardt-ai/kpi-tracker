(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/kpi-tracker/app/lib/supabase.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "addTicketUpdate",
    ()=>addTicketUpdate,
    "closeTicket",
    ()=>closeTicket,
    "createTicket",
    ()=>createTicket,
    "deleteTicket",
    ()=>deleteTicket,
    "getAllProfiles",
    ()=>getAllProfiles,
    "getAllTickets",
    ()=>getAllTickets,
    "getCurrentProfile",
    ()=>getCurrentProfile,
    "getCurrentUser",
    ()=>getCurrentUser,
    "getProfileById",
    ()=>getProfileById,
    "getTicketsByUserId",
    ()=>getTicketsByUserId,
    "logTicketTime",
    ()=>logTicketTime,
    "resetPassword",
    ()=>resetPassword,
    "signIn",
    ()=>signIn,
    "signOut",
    ()=>signOut,
    "signUp",
    ()=>signUp,
    "supabase",
    ()=>supabase,
    "updatePassword",
    ()=>updatePassword,
    "updateProfile",
    ()=>updateProfile,
    "updateTicket",
    ()=>updateTicket,
    "uploadProfilePicture",
    ()=>uploadProfilePicture,
    "uploadTicketAttachment",
    ()=>uploadTicketAttachment
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/kpi-tracker/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$esm$2f$wrapper$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/kpi-tracker/node_modules/@supabase/supabase-js/dist/esm/wrapper.mjs [app-client] (ecmascript)");
;
const supabaseUrl = ("TURBOPACK compile-time value", "https://csbliwkldlglbniqmdin.supabase.co");
const supabaseAnonKey = ("TURBOPACK compile-time value", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNzYmxpd2tsZGxnbGJuaXFtZGluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5Mjk3NjMsImV4cCI6MjA4MDUwNTc2M30.ZcYJVyFiJUSsL7xVX1bpgSlwMr8f0t1E4Xtgvpl3amQ");
const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$esm$2f$wrapper$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createClient"])(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
    }
});
async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    });
    return {
        data,
        error
    };
}
async function signUp(email, password, fullName, role) {
    // Additional security: This should only be called from admin context
    // In production, consider adding server-side API route protection
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                full_name: fullName,
                role: role
            }
        }
    });
    return {
        data,
        error
    };
}
async function signOut() {
    const { error } = await supabase.auth.signOut();
    return {
        error
    };
}
async function resetPassword(email) {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
    });
    return {
        data,
        error
    };
}
async function updatePassword(newPassword) {
    const { data, error } = await supabase.auth.updateUser({
        password: newPassword
    });
    return {
        data,
        error
    };
}
async function getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
}
async function getCurrentProfile(userId) {
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
        const { data, error } = await supabase.from('profiles').select('*').eq('id', uid).single();
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
async function getAllProfiles() {
    const { data, error } = await supabase.from('profiles').select('*').order('full_name');
    if (error) {
        console.error('Error fetching profiles:', error);
        return [];
    }
    return data || [];
}
async function getProfileById(id) {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', id).single();
    if (error) {
        console.error('Error fetching profile:', error);
        return null;
    }
    return data;
}
async function updateProfile(id, updates) {
    const { data, error } = await supabase.from('profiles').update({
        ...updates,
        updated_at: new Date().toISOString()
    }).eq('id', id).select().single();
    return {
        data,
        error
    };
}
async function uploadProfilePicture(userId, file) {
    const fileExt = file.name.split('.').pop();
    // Use consistent filename to allow overwriting
    const fileName = `${userId}.${fileExt}`;
    const filePath = `avatars/${fileName}`;
    // First, try to delete the old file if it exists
    const { data: existingFiles } = await supabase.storage.from('profiles').list('avatars', {
        search: userId
    });
    if (existingFiles && existingFiles.length > 0) {
        // Delete old avatar files for this user
        const filesToDelete = existingFiles.filter((f)=>f.name.startsWith(userId)).map((f)=>`avatars/${f.name}`);
        if (filesToDelete.length > 0) {
            await supabase.storage.from('profiles').remove(filesToDelete);
        }
    }
    // Upload the new file (upsert allows overwriting)
    const { error: uploadError } = await supabase.storage.from('profiles').upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
    });
    if (uploadError) {
        console.error('Error uploading file:', uploadError);
        return {
            publicUrl: null,
            error: uploadError
        };
    }
    const { data: publicUrlData } = supabase.storage.from('profiles').getPublicUrl(filePath);
    if (!publicUrlData || !publicUrlData.publicUrl) {
        return {
            publicUrl: null,
            error: new Error('Could not get public URL for uploaded file.')
        };
    }
    // Update profile with new avatar_url
    const { error: updateError } = await supabase.from('profiles').update({
        avatar_url: publicUrlData.publicUrl
    }).eq('id', userId);
    if (updateError) {
        console.error('Error updating profile with avatar URL:', updateError);
        return {
            publicUrl: null,
            error: updateError
        };
    }
    return {
        publicUrl: publicUrlData.publicUrl,
        error: null
    };
}
async function uploadTicketAttachment(ticketId, file, fileType, label) {
    const fileExt = file.name.split('.').pop();
    const timestamp = Date.now();
    const fileName = `${ticketId}-${timestamp}.${fileExt}`;
    const folder = fileType === 'site_file' ? 'site-files' : 'attachments';
    const filePath = `${folder}/${fileName}`;
    // Upload the file
    const { error: uploadError } = await supabase.storage.from('tickets').upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
    });
    if (uploadError) {
        console.error('Error uploading ticket file:', uploadError);
        return {
            url: null,
            error: uploadError
        };
    }
    const { data: publicUrlData } = supabase.storage.from('tickets').getPublicUrl(filePath);
    if (!publicUrlData || !publicUrlData.publicUrl) {
        return {
            url: null,
            error: new Error('Could not get public URL for uploaded file.')
        };
    }
    return {
        url: publicUrlData.publicUrl,
        error: null
    };
}
async function getAllTickets() {
    try {
        const { data, error } = await supabase.from('tickets').select('*, profile:profiles!user_id(*)').order('created_at', {
            ascending: false
        });
        if (error) {
            // Log error details in a way that's visible in the console
            const errorInfo = `Error fetching tickets: ${error.message || 'Unknown error'} (Code: ${error.code || 'NO_CODE'})`;
            console.error(errorInfo);
            // Log structured error for debugging
            console.error('Error details:', {
                message: error.message,
                code: error.code,
                details: error.details,
                hint: error.hint
            });
            // Also log to help debug RLS issues
            if (error.code === 'PGRST116' || error.message?.includes('permission') || error.message?.includes('policy')) {
                console.error('⚠️ This might be an RLS (Row Level Security) policy issue. Check your Supabase RLS policies.');
                console.error('Make sure your user profile has is_admin = TRUE in the profiles table.');
            }
            return [];
        }
        // Ensure time_logs is always an array for existing tickets
        const normalizedData = (data || []).map((ticket)=>({
                ...ticket,
                time_logs: Array.isArray(ticket.time_logs) ? ticket.time_logs : [],
                updates: Array.isArray(ticket.updates) ? ticket.updates : [],
                total_time_minutes: ticket.total_time_minutes || 0
            }));
        return normalizedData;
    } catch (err) {
        console.error('Exception in getAllTickets:', err);
        console.error('Exception details:', err?.message, err?.stack);
        return [];
    }
}
async function getTicketsByUserId(userId) {
    try {
        const { data, error } = await supabase.from('tickets').select('*').eq('user_id', userId).order('created_at', {
            ascending: false
        });
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
        const normalizedData = (data || []).map((ticket)=>({
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
async function createTicket(ticket) {
    // Generate ticket number
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    // Get user's initials from profile
    const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', ticket.user_id).single();
    const initials = profile?.full_name ? profile.full_name.split(' ').map((n)=>n[0]).join('').toUpperCase() : 'XX';
    // Get count of tickets for this user today
    const { count } = await supabase.from('tickets').select('*', {
        count: 'exact',
        head: true
    }).eq('user_id', ticket.user_id).gte('created_at', today.toISOString().slice(0, 10));
    const seq = String((count || 0) + 1).padStart(3, '0');
    const ticketNumber = `${initials}-${dateStr}-${seq}`;
    const now = new Date();
    // Initialize with a time log entry for ticket creation
    const initialTimeLog = {
        minutes: 0,
        description: 'Ticket opened',
        timestamp: now.toISOString(),
        logged_by: 'System'
    };
    const { data, error } = await supabase.from('tickets').insert({
        ...ticket,
        ticket_number: ticketNumber,
        status: 'open',
        updates: [],
        time_logs: [
            initialTimeLog
        ],
        total_time_minutes: 0,
        installers: ticket.installers || [],
        dependencies: ticket.dependencies || [],
        site_files: ticket.site_files || [],
        attachments: ticket.attachments || []
    }).select().single();
    return {
        data,
        error: error
    };
}
async function updateTicket(ticketId, updates) {
    const { data, error } = await supabase.from('tickets').update(updates).eq('id', ticketId).select().single();
    return {
        data,
        error
    };
}
async function closeTicket(ticketId, resolution) {
    // Get the ticket to calculate response time
    const { data: ticket, error: fetchError } = await supabase.from('tickets').select('created_at').eq('id', ticketId).single();
    if (fetchError || !ticket) {
        console.error('Error fetching ticket:', fetchError);
        return {
            data: null,
            error: fetchError
        };
    }
    // Calculate response time in minutes
    const createdAt = new Date(ticket.created_at);
    const closedAt = new Date();
    const responseTimeMinutes = Math.round((closedAt.getTime() - createdAt.getTime()) / (1000 * 60));
    const { data, error } = await supabase.from('tickets').update({
        status: 'closed',
        resolution,
        response_time_minutes: responseTimeMinutes,
        closed_at: closedAt.toISOString()
    }).eq('id', ticketId).select().single();
    return {
        data,
        error
    };
}
async function deleteTicket(ticketId) {
    const { error } = await supabase.from('tickets').delete().eq('id', ticketId);
    return {
        error
    };
}
async function addTicketUpdate(ticketId, updateText, loggedBy) {
    // Get the current ticket with all necessary fields
    const { data: ticket, error: fetchError } = await supabase.from('tickets').select('created_at, updates, time_logs, total_time_minutes').eq('id', ticketId).single();
    if (fetchError) {
        return {
            data: null,
            error: fetchError
        };
    }
    const now = new Date();
    const newUpdate = {
        text: updateText,
        timestamp: now.toISOString()
    };
    // Append to existing updates or create new array
    const existingUpdates = ticket?.updates || [];
    const updatedUpdates = [
        ...existingUpdates,
        newUpdate
    ];
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
        updatedLogs = [
            ...existingLogs,
            newTimeLog
        ];
    }
    // Calculate total time
    const totalTime = updatedLogs.reduce((sum, log)=>sum + log.minutes, 0);
    // Update the ticket with both updates and time logs
    const { data, error } = await supabase.from('tickets').update({
        updates: updatedUpdates,
        time_logs: updatedLogs.length > 0 ? updatedLogs : [],
        total_time_minutes: totalTime
    }).eq('id', ticketId).select().single();
    if (error) {
        console.error('Error updating ticket with time logs:', error.message || error.code || error);
    }
    return {
        data,
        error
    };
}
async function logTicketTime(ticketId, minutes, description, loggedBy) {
    // First get the current ticket to get existing time logs
    const { data: ticket, error: fetchError } = await supabase.from('tickets').select('time_logs, total_time_minutes').eq('id', ticketId).single();
    if (fetchError) {
        return {
            data: null,
            error: fetchError
        };
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
    const updatedLogs = [
        ...existingLogs,
        newTimeLog
    ];
    // Calculate total time
    const totalTime = updatedLogs.reduce((sum, log)=>sum + log.minutes, 0);
    // Update the ticket
    const { data, error } = await supabase.from('tickets').update({
        time_logs: updatedLogs,
        total_time_minutes: totalTime
    }).eq('id', ticketId).select().single();
    return {
        data,
        error
    };
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/kpi-tracker/app/context/AuthContext.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "AuthProvider",
    ()=>AuthProvider,
    "useAuth",
    ()=>useAuth
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/kpi-tracker/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/kpi-tracker/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$app$2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/kpi-tracker/app/lib/supabase.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature(), _s1 = __turbopack_context__.k.signature();
'use client';
;
;
const AuthContext = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createContext"])(undefined);
function AuthProvider({ children }) {
    _s();
    const [user, setUser] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [profile, setProfile] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [session, setSession] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(true);
    const fetchProfile = (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "AuthProvider.useCallback[fetchProfile]": async (userId)=>{
            try {
                const prof = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$app$2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getCurrentProfile"])(userId);
                setProfile(prof);
                return prof;
            } catch (err) {
                console.error('Error fetching profile:', err);
                return null;
            }
        }
    }["AuthProvider.useCallback[fetchProfile]"], []);
    const refreshProfile = (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "AuthProvider.useCallback[refreshProfile]": async ()=>{
            if (user?.id) {
                await fetchProfile(user.id);
            }
        }
    }["AuthProvider.useCallback[refreshProfile]"], [
        user?.id,
        fetchProfile
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "AuthProvider.useEffect": ()=>{
            let isMounted = true;
            const initialize = {
                "AuthProvider.useEffect.initialize": async ()=>{
                    try {
                        // Get the current session
                        const { data: { session: currentSession } } = await __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$app$2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].auth.getSession();
                        if (!isMounted) return;
                        if (currentSession?.user) {
                            setSession(currentSession);
                            setUser(currentSession.user);
                            await fetchProfile(currentSession.user.id);
                        }
                    } catch (error) {
                        console.error('Auth initialization error:', error);
                    } finally{
                        if (isMounted) {
                            setLoading(false);
                        }
                    }
                }
            }["AuthProvider.useEffect.initialize"];
            // Set up auth state listener FIRST
            const { data: { subscription } } = __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$app$2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].auth.onAuthStateChange({
                "AuthProvider.useEffect": async (event, newSession)=>{
                    if (!isMounted) return;
                    console.log('Auth state change:', event);
                    setSession(newSession);
                    setUser(newSession?.user ?? null);
                    if (newSession?.user) {
                        // Use setTimeout to avoid race conditions with Supabase
                        setTimeout({
                            "AuthProvider.useEffect": ()=>{
                                if (isMounted) {
                                    fetchProfile(newSession.user.id);
                                }
                            }
                        }["AuthProvider.useEffect"], 100);
                    } else {
                        setProfile(null);
                    }
                    setLoading(false);
                }
            }["AuthProvider.useEffect"]);
            // Then initialize
            initialize();
            // Safety timeout
            const timeout = setTimeout({
                "AuthProvider.useEffect.timeout": ()=>{
                    if (isMounted && loading) {
                        console.log('Auth timeout - forcing load complete');
                        setLoading(false);
                    }
                }
            }["AuthProvider.useEffect.timeout"], 3000);
            return ({
                "AuthProvider.useEffect": ()=>{
                    isMounted = false;
                    subscription.unsubscribe();
                    clearTimeout(timeout);
                }
            })["AuthProvider.useEffect"];
        }
    }["AuthProvider.useEffect"], [
        fetchProfile,
        loading
    ]);
    const signIn = async (email, password)=>{
        const { error } = await __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$app$2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].auth.signInWithPassword({
            email,
            password
        });
        return {
            error: error
        };
    };
    const signUp = async (email, password, fullName, role)=>{
        const avatar = fullName.split(' ').map((part)=>part.charAt(0).toUpperCase()).join('').slice(0, 2);
        const { error } = await __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$app$2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                    role: role,
                    avatar: avatar
                }
            }
        });
        return {
            error: error
        };
    };
    const signOut = async ()=>{
        await __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$app$2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].auth.signOut();
        setUser(null);
        setProfile(null);
        setSession(null);
    };
    const value = {
        user,
        profile,
        session,
        loading,
        isAdmin: profile?.is_admin ?? false,
        signIn,
        signUp,
        signOut,
        refreshProfile
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(AuthContext.Provider, {
        value: value,
        children: children
    }, void 0, false, {
        fileName: "[project]/kpi-tracker/app/context/AuthContext.tsx",
        lineNumber: 157,
        columnNumber: 5
    }, this);
}
_s(AuthProvider, "jUrE9D8W5BEUTyQmiumBYEJ6Dn8=");
_c = AuthProvider;
function useAuth() {
    _s1();
    const context = (0, __TURBOPACK__imported__module__$5b$project$5d2f$kpi$2d$tracker$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useContext"])(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
_s1(useAuth, "b9L3QQ+jgeyIrH0NfHrJ8nn7VMU=");
var _c;
__turbopack_context__.k.register(_c, "AuthProvider");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=kpi-tracker_app_dcec0dbe._.js.map