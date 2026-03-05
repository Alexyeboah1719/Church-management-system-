-- Church Youth Management System - Supabase Database Schema
-- Run this in Supabase SQL Editor to create all tables

-- Enable Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- MEMBERS TABLE
-- =====================================================
CREATE TABLE members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    location TEXT,
    date_of_birth DATE,
    password TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    active BOOLEAN DEFAULT true,
    roles TEXT[] DEFAULT '{}',
    date_joined DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- EVENTS TABLE
-- =====================================================
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    event_date DATE NOT NULL,
    event_time TIME NOT NULL,
    venue TEXT NOT NULL,
    event_type TEXT DEFAULT 'special-event',
    created_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- ATTENDANCE TABLE
-- =====================================================
CREATE TABLE attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    member_id UUID REFERENCES members(id) ON DELETE CASCADE,
    member_name TEXT,
    attendance_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(event_id, member_id)
);

-- =====================================================
-- TASKS TABLE
-- =====================================================
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    assigned_to UUID REFERENCES members(id) ON DELETE CASCADE,
    assigned_by TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in-progress', 'completed')),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    due_date DATE,
    progress INTEGER DEFAULT 0,
    assigned_date DATE DEFAULT CURRENT_DATE,
    completed_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- ANNOUNCEMENTS TABLE
-- =====================================================
CREATE TABLE announcements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT DEFAULT 'general',
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    created_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- MESSAGES TABLE
-- =====================================================
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID REFERENCES members(id) ON DELETE CASCADE,
    sender_name TEXT NOT NULL,
    sender_email TEXT,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    is_admin BOOLEAN DEFAULT false,
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- DAILY VERSES TABLE
-- =====================================================
CREATE TABLE daily_verses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    verse_text TEXT NOT NULL,
    verse_reference TEXT NOT NULL,
    verse_date DATE UNIQUE NOT NULL,
    created_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- ADMIN ACTIVITIES TABLE
-- =====================================================
CREATE TABLE admin_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- SMS LOGS TABLE
-- =====================================================
CREATE TABLE sms_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipient TEXT NOT NULL,
    phone TEXT NOT NULL,
    message TEXT NOT NULL,
    event TEXT,
    event_id UUID REFERENCES events(id) ON DELETE SET NULL,
    type TEXT DEFAULT 'general',
    status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'demo')),
    error TEXT,
    message_id TEXT,
    cost NUMERIC(10, 4),
    provider TEXT DEFAULT 'twilio',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- ADMIN ACCOUNT TABLE
-- =====================================================
CREATE TABLE admin_account (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default admin account
INSERT INTO admin_account (name, email, password)
VALUES ('System Administrator', 'admin@church.org', 'Admin123!')
ON CONFLICT (email) DO NOTHING;

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX idx_members_email ON members(email);
CREATE INDEX idx_members_status ON members(status);
CREATE INDEX idx_events_date ON events(event_date);
CREATE INDEX idx_attendance_event ON attendance(event_id);
CREATE INDEX idx_attendance_member ON attendance(member_id);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_read ON messages(read);
CREATE INDEX idx_daily_verses_date ON daily_verses(verse_date);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_verses ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_account ENABLE ROW LEVEL SECURITY;

-- Members Table Policies
CREATE POLICY "Admins can do everything on members" ON members FOR ALL 
    USING (EXISTS (SELECT 1 FROM admin_account WHERE email = (auth.jwt() ->> 'email')))
    WITH CHECK (EXISTS (SELECT 1 FROM admin_account WHERE email = (auth.jwt() ->> 'email')));

CREATE POLICY "Members can view their own profile" ON members FOR SELECT
    USING (auth.jwt() ->> 'email' = email);

CREATE POLICY "Members can update their own profile" ON members FOR UPDATE
    USING (auth.jwt() ->> 'email' = email)
    WITH CHECK (auth.jwt() ->> 'email' = email);

CREATE POLICY "Public can register" ON members FOR INSERT
    WITH CHECK (status = 'pending');

-- Events Table Policies
CREATE POLICY "Admins can manage events" ON events FOR ALL 
    USING (EXISTS (SELECT 1 FROM admin_account WHERE email = (auth.jwt() ->> 'email')))
    WITH CHECK (EXISTS (SELECT 1 FROM admin_account WHERE email = (auth.jwt() ->> 'email')));

CREATE POLICY "Anyone can view events" ON events FOR SELECT USING (true);

-- Attendance Table Policies
CREATE POLICY "Admins can manage attendance" ON attendance FOR ALL 
    USING (EXISTS (SELECT 1 FROM admin_account WHERE email = (auth.jwt() ->> 'email')))
    WITH CHECK (EXISTS (SELECT 1 FROM admin_account WHERE email = (auth.jwt() ->> 'email')));

CREATE POLICY "Members can view their own attendance" ON attendance FOR SELECT
    USING (member_id IN (SELECT id FROM members WHERE email = (auth.jwt() ->> 'email')));

-- Tasks Table Policies
CREATE POLICY "Admins can manage tasks" ON tasks FOR ALL 
    USING (EXISTS (SELECT 1 FROM admin_account WHERE email = (auth.jwt() ->> 'email')))
    WITH CHECK (EXISTS (SELECT 1 FROM admin_account WHERE email = (auth.jwt() ->> 'email')));

CREATE POLICY "Members can view and update their assigned tasks" ON tasks FOR ALL
    USING (assigned_to IN (SELECT id FROM members WHERE email = (auth.jwt() ->> 'email')))
    WITH CHECK (assigned_to IN (SELECT id FROM members WHERE email = (auth.jwt() ->> 'email')));

-- Announcements Table Policies
CREATE POLICY "Admins can manage announcements" ON announcements FOR ALL 
    USING (EXISTS (SELECT 1 FROM admin_account WHERE email = (auth.jwt() ->> 'email')))
    WITH CHECK (EXISTS (SELECT 1 FROM admin_account WHERE email = (auth.jwt() ->> 'email')));

CREATE POLICY "Anyone can view announcements" ON announcements FOR SELECT USING (true);

-- Messages Table Policies
CREATE POLICY "Admins can manage messages" ON messages FOR ALL 
    USING (EXISTS (SELECT 1 FROM admin_account WHERE email = (auth.jwt() ->> 'email')))
    WITH CHECK (EXISTS (SELECT 1 FROM admin_account WHERE email = (auth.jwt() ->> 'email')));

CREATE POLICY "Members can manage their own messages" ON messages FOR ALL
    USING (sender_id IN (SELECT id FROM members WHERE email = (auth.jwt() ->> 'email')))
    WITH CHECK (sender_id IN (SELECT id FROM members WHERE email = (auth.jwt() ->> 'email')));

-- Daily Verses Table Policies
CREATE POLICY "Admins can manage daily verses" ON daily_verses FOR ALL 
    USING (EXISTS (SELECT 1 FROM admin_account WHERE email = (auth.jwt() ->> 'email')))
    WITH CHECK (EXISTS (SELECT 1 FROM admin_account WHERE email = (auth.jwt() ->> 'email')));

CREATE POLICY "Anyone can view daily verses" ON daily_verses FOR SELECT USING (true);

-- Admin Activities Table Policies
CREATE POLICY "Only admins can manage activities" ON admin_activities FOR ALL 
    USING (EXISTS (SELECT 1 FROM admin_account WHERE email = (auth.jwt() ->> 'email')))
    WITH CHECK (EXISTS (SELECT 1 FROM admin_account WHERE email = (auth.jwt() ->> 'email')));

-- SMS Logs Table Policies
CREATE POLICY "Only admins can view SMS logs" ON sms_logs FOR SELECT
    USING (EXISTS (SELECT 1 FROM admin_account WHERE email = (auth.jwt() ->> 'email')));

-- Admin Account Table Policies
CREATE POLICY "Admins can manage admin accounts" ON admin_account FOR ALL 
    USING (EXISTS (SELECT 1 FROM admin_account WHERE email = (auth.jwt() ->> 'email')))
    WITH CHECK (EXISTS (SELECT 1 FROM admin_account WHERE email = (auth.jwt() ->> 'email')));

-- =====================================================
-- UPDATED_AT TRIGGER FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables with updated_at column
CREATE TRIGGER update_members_updated_at BEFORE UPDATE ON members
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_announcements_updated_at BEFORE UPDATE ON announcements
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_admin_account_updated_at BEFORE UPDATE ON admin_account
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- PASSWORD HASHING SYSTEM
-- =====================================================

-- Function to hash password before insert or update
CREATE OR REPLACE FUNCTION hash_password_trigger()
RETURNS TRIGGER AS $$
BEGIN
    -- Only hash if the password is new or has changed
    -- and check if it's already a crypt hash format (simple check)
    IF (TG_OP = 'INSERT' OR NEW.password IS DISTINCT FROM OLD.password) THEN
        -- Check if it looks like a bcrypt hash (starts with $2)
        IF NEW.password NOT LIKE '$2%' THEN
            NEW.password = crypt(NEW.password, gen_salt('bf', 8));
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply hashing to members table
CREATE TRIGGER hash_member_password BEFORE INSERT OR UPDATE ON members
    FOR EACH ROW EXECUTE FUNCTION hash_password_trigger();

-- Apply hashing to admin_account table
CREATE TRIGGER hash_admin_password BEFORE INSERT OR UPDATE ON admin_account
    FOR EACH ROW EXECUTE FUNCTION hash_password_trigger();

-- =====================================================
-- AUTOMATED ACTIVITY LOGGING
-- =====================================================

-- Function to automatically log member status changes
CREATE OR REPLACE FUNCTION log_member_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
        INSERT INTO admin_activities (description)
        VALUES ('Member status updated for ' || NEW.name || ': ' || OLD.status || ' -> ' || NEW.status);
    ELSIF (TG_OP = 'DELETE') THEN
        INSERT INTO admin_activities (description)
        VALUES ('Member deleted: ' || OLD.name || ' (' || OLD.email || ')');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_log_member_status BEFORE UPDATE OR DELETE ON members
    FOR EACH ROW EXECUTE FUNCTION log_member_status_change();

-- Function to automatically log event updates
CREATE OR REPLACE FUNCTION log_event_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO admin_activities (description)
        VALUES ('New event created: ' || NEW.title);
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO admin_activities (description)
        VALUES ('Event updated: ' || NEW.title);
    ELSIF (TG_OP = 'DELETE') THEN
        INSERT INTO admin_activities (description)
        VALUES ('Event deleted: ' || OLD.title);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_log_event_activity AFTER INSERT OR UPDATE OR DELETE ON events
    FOR EACH ROW EXECUTE FUNCTION log_event_changes();

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '✅ Database schema created successfully!';
    RAISE NOTICE '📊 Tables created: 10';
    RAISE NOTICE '🔐 Row Level Security enabled';
    RAISE NOTICE '👤 Default admin account created';
    RAISE NOTICE '📧 Admin email: admin@church.org';
    RAISE NOTICE '🔑 Admin password: Admin123!';
END $$;
