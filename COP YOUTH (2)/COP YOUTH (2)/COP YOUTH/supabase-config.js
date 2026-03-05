// Supabase Configuration
// This file handles the connection to Supabase database

// =====================================================
// SUPABASE CREDENTIALS
// =====================================================
const SUPABASE_URL = 'https://idiztsjiuxjsbmpcemni.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkaXp0c2ppdXhqc2JtcGNlbW5pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NDc2ODgsImV4cCI6MjA4ODIyMzY4OH0.RxCWBu44EJNERQWGtZhy2JUjfdLXeFpcuhqVJbKMZeE';

// =====================================================
// INITIALIZE SUPABASE
// =====================================================
let supabaseClient = null;
let supabaseReady = false;

// Initialize immediately when script loads
(function initializeSupabase() {
    try {
        if (typeof window.supabase === 'undefined') {
            console.error('❌ Supabase library not loaded');
            return;
        }

        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        supabaseReady = true;
        window.supabaseReady = true;

        console.log('✅ Supabase initialized successfully');
        console.log('🔗 Connected to:', SUPABASE_URL);

        // Trigger custom event
        window.dispatchEvent(new Event('supabaseReady'));
    } catch (error) {
        console.error('❌ Error initializing Supabase:', error);
    }
})();

// =====================================================
// DATABASE HELPER FUNCTIONS
// =====================================================

// Generic function to fetch all records from a table
async function fetchAll(tableName) {
    try {
        console.log(`[fetchAll] Fetching from table: ${tableName}`);
        console.log(`[fetchAll] supabaseClient available:`, !!supabaseClient);

        if (!supabaseClient) {
            throw new Error('Supabase client not initialized');
        }

        // Add timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Request timeout after 10 seconds')), 10000)
        );

        const fetchPromise = supabaseClient
            .from(tableName)
            .select('*')
            .order('created_at', { ascending: false });

        const { data, error } = await Promise.race([fetchPromise, timeoutPromise]);

        console.log(`[fetchAll] ${tableName} - data:`, data);
        console.log(`[fetchAll] ${tableName} - error:`, error);

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error(`[fetchAll] Error fetching ${tableName}:`, error);
        console.error(`[fetchAll] Error details:`, {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint
        });
        return { success: false, error: error.message || String(error) };
    }
}

// Generic function to insert a record
async function insertRecord(tableName, record) {
    try {
        const { data, error } = await supabaseClient
            .from(tableName)
            .insert([record])
            .select();

        if (error) throw error;
        return { success: true, data: data[0] };
    } catch (error) {
        console.error(`Error inserting into ${tableName}:`, error);
        return { success: false, error: error.message };
    }
}

// Generic function to update a record
async function updateRecord(tableName, id, updates) {
    try {
        const { data, error } = await supabaseClient
            .from(tableName)
            .update(updates)
            .eq('id', id)
            .select();

        if (error) throw error;
        return { success: true, data: data[0] };
    } catch (error) {
        console.error(`Error updating ${tableName}:`, error);
        return { success: false, error: error.message };
    }
}

// Generic function to delete a record
async function deleteRecord(tableName, id) {
    try {
        const { error } = await supabaseClient
            .from(tableName)
            .delete()
            .eq('id', id);

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error(`Error deleting from ${tableName}:`, error);
        return { success: false, error: error.message };
    }
}

// =====================================================
// MEMBER FUNCTIONS
// =====================================================

async function getMembers() {
    return await fetchAll('members');
}

async function getMemberByEmail(email) {
    try {
        const { data, error } = await supabaseClient
            .from('members')
            .select('*')
            .eq('email', email)
            .single();

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function createMember(member) {
    return await insertRecord('members', member);
}

async function updateMember(id, updates) {
    return await updateRecord('members', id, updates);
}

async function deleteMember(id) {
    return await deleteRecord('members', id);
}

// =====================================================
// EVENT FUNCTIONS
// =====================================================

async function getEvents() {
    return await fetchAll('events');
}

async function createEvent(event) {
    return await insertRecord('events', event);
}

async function updateEvent(id, updates) {
    return await updateRecord('events', id, updates);
}

async function deleteEvent(id) {
    return await deleteRecord('events', id);
}

// =====================================================
// ATTENDANCE FUNCTIONS
// =====================================================

async function getAttendance() {
    return await fetchAll('attendance');
}

async function markAttendance(eventId, memberIds) {
    try {
        // First, delete existing attendance for this event
        await supabaseClient
            .from('attendance')
            .delete()
            .eq('event_id', eventId);

        // Then insert new attendance records
        const attendanceRecords = memberIds.map(memberId => ({
            event_id: eventId,
            member_id: memberId
        }));

        const { data, error } = await supabaseClient
            .from('attendance')
            .insert(attendanceRecords)
            .select();

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Error marking attendance:', error);
        return { success: false, error: error.message };
    }
}

// =====================================================
// TASK FUNCTIONS
// =====================================================

async function getTasks() {
    return await fetchAll('tasks');
}

async function createTask(task) {
    return await insertRecord('tasks', task);
}

async function updateTask(id, updates) {
    return await updateRecord('tasks', id, updates);
}

async function deleteTask(id) {
    return await deleteRecord('tasks', id);
}

// =====================================================
// ANNOUNCEMENT FUNCTIONS
// =====================================================

async function getAnnouncements() {
    return await fetchAll('announcements');
}

async function createAnnouncement(announcement) {
    return await insertRecord('announcements', announcement);
}

async function updateAnnouncement(id, updates) {
    return await updateRecord('announcements', id, updates);
}

async function deleteAnnouncement(id) {
    return await deleteRecord('announcements', id);
}

// =====================================================
// MESSAGE FUNCTIONS
// =====================================================

async function getMessages() {
    return await fetchAll('messages');
}

async function createMessage(message) {
    return await insertRecord('messages', message);
}

async function markMessageAsRead(id) {
    return await updateRecord('messages', id, { read: true });
}

async function deleteMessage(id) {
    return await deleteRecord('messages', id);
}

// =====================================================
// DAILY VERSE FUNCTIONS
// =====================================================

async function getDailyVerses() {
    return await fetchAll('daily_verses');
}

async function createDailyVerse(verse) {
    return await insertRecord('daily_verses', verse);
}

async function updateDailyVerse(id, updates) {
    return await updateRecord('daily_verses', id, updates);
}

async function deleteDailyVerse(id) {
    return await deleteRecord('daily_verses', id);
}

// =====================================================
// ADMIN ACTIVITY FUNCTIONS
// =====================================================

async function getAdminActivities() {
    return await fetchAll('admin_activities');
}

async function logAdminActivity(description) {
    return await insertRecord('admin_activities', { description });
}

// =====================================================
// SMS LOG FUNCTIONS
// =====================================================

async function getSMSLogs() {
    return await fetchAll('sms_logs');
}

async function logSMS(smsData) {
    return await insertRecord('sms_logs', smsData);
}

// =====================================================
// ADMIN ACCOUNT FUNCTIONS
// =====================================================

async function getAdminAccount() {
    try {
        const { data, error } = await supabaseClient
            .from('admin_account')
            .select('*')
            .limit(1)
            .single();

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function updateAdminAccount(id, updates) {
    return await updateRecord('admin_account', id, updates);
}

// =====================================================
// AUTHENTICATION FUNCTIONS
// =====================================================

async function authenticateMember(email, password) {
    try {
        const { data, error } = await supabaseClient
            .from('members')
            .select('*')
            .eq('email', email)
            .eq('password', password)
            .eq('status', 'approved')
            .single();

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        return { success: false, error: 'Invalid credentials or account not approved' };
    }
}

async function authenticateAdmin(email, password) {
    try {
        const { data, error } = await supabaseClient
            .from('admin_account')
            .select('*')
            .eq('email', email)
            .eq('password', password)
            .single();

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        return { success: false, error: 'Invalid admin credentials' };
    }
}

// =====================================================
// MIGRATION FUNCTION (localStorage to Supabase)
// =====================================================

async function migrateFromLocalStorage() {
    console.log('🔄 Starting migration from localStorage to Supabase...');

    try {
        // Migrate members
        const members = JSON.parse(localStorage.getItem('members') || '[]');
        if (members.length > 0) {
            console.log(`📤 Migrating ${members.length} members...`);
            for (const member of members) {
                await createMember(member);
            }
        }

        // Migrate events
        const events = JSON.parse(localStorage.getItem('events') || '[]');
        if (events.length > 0) {
            console.log(`📤 Migrating ${events.length} events...`);
            for (const event of events) {
                await createEvent({
                    ...event,
                    event_date: event.date,
                    event_time: event.time
                });
            }
        }

        // Migrate attendance
        const attendance = JSON.parse(localStorage.getItem('attendance') || '[]');
        if (attendance.length > 0) {
            console.log(`📤 Migrating ${attendance.length} attendance records...`);
            for (const record of attendance) {
                await insertRecord('attendance', {
                    event_id: record.eventId,
                    member_id: record.memberId,
                    member_name: record.memberName,
                    attendance_date: record.date
                });
            }
        }

        // Migrate tasks
        const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
        if (tasks.length > 0) {
            console.log(`📤 Migrating ${tasks.length} tasks...`);
            for (const task of tasks) {
                await createTask({
                    ...task,
                    assigned_to: task.assignedTo,
                    assigned_by: task.assignedBy,
                    due_date: task.dueDate,
                    assigned_date: task.assignedDate,
                    completed_date: task.completedDate
                });
            }
        }

        // Migrate announcements
        const announcements = JSON.parse(localStorage.getItem('announcements') || '[]');
        if (announcements.length > 0) {
            console.log(`📤 Migrating ${announcements.length} announcements...`);
            for (const announcement of announcements) {
                await createAnnouncement({
                    ...announcement,
                    created_by: announcement.createdBy
                });
            }
        }

        console.log('✅ Migration completed successfully!');
        return { success: true };
    } catch (error) {
        console.error('❌ Migration failed:', error);
        return { success: false, error: error.message };
    }
}

// =====================================================
// EXPORT FUNCTIONS TO WINDOW
// =====================================================
window.supabaseDB = {
    // Members
    getMembers,
    getMemberByEmail,
    createMember,
    updateMember,
    deleteMember,

    // Events
    getEvents,
    createEvent,
    updateEvent,
    deleteEvent,

    // Attendance
    getAttendance,
    markAttendance,

    // Tasks
    getTasks,
    createTask,
    updateTask,
    deleteTask,

    // Announcements
    getAnnouncements,
    createAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,

    // Messages
    getMessages,
    createMessage,
    markMessageAsRead,
    deleteMessage,

    // Daily Verses
    getDailyVerses,
    createDailyVerse,
    updateDailyVerse,
    deleteDailyVerse,

    // Admin Activities
    getAdminActivities,
    logAdminActivity,

    // SMS Logs
    getSMSLogs,
    logSMS,

    // Admin Account
    getAdminAccount,
    updateAdminAccount,

    // Authentication
    authenticateMember,
    authenticateAdmin,

    // Migration
    migrateFromLocalStorage
};

console.log('📦 Supabase configuration loaded');
console.log('💡 Use window.supabaseDB to access database functions');
