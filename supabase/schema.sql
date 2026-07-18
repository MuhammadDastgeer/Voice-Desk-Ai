-- SUPABASE SQL SCHEMA SETUP
-- Paste this script directly into your Supabase SQL Editor (https://supabase.com)
-- to automatically provision the database tables required for Business Profile and Business Hours.

-- 1. Create Business Profiles Table (Linked to Supabase Auth Users)
CREATE TABLE IF NOT EXISTS public.business_profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    zip TEXT,
    website TEXT,
    timezone TEXT DEFAULT 'America/New_York',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Create Business Hours Table (Linked to Supabase Auth Users)
CREATE TABLE IF NOT EXISTS public.business_hours (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    sunday JSONB DEFAULT '{"isOpen": false, "from": "09:00", "to": "17:00"}'::jsonb,
    monday JSONB DEFAULT '{"isOpen": true, "from": "08:00", "to": "18:00"}'::jsonb,
    tuesday JSONB DEFAULT '{"isOpen": true, "from": "08:00", "to": "18:00"}'::jsonb,
    wednesday JSONB DEFAULT '{"isOpen": true, "from": "08:00", "to": "18:00"}'::jsonb,
    thursday JSONB DEFAULT '{"isOpen": true, "from": "08:00", "to": "18:00"}'::jsonb,
    friday JSONB DEFAULT '{"isOpen": true, "from": "08:00", "to": "18:00"}'::jsonb,
    saturday JSONB DEFAULT '{"isOpen": false, "from": "09:00", "to": "17:00"}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. Enable Row Level Security (RLS) to protect user data
ALTER TABLE public.business_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_hours ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS Policies for Business Profiles
CREATE POLICY "Users can view their own business profile" 
    ON public.business_profiles 
    FOR SELECT 
    USING (auth.uid() = id);

CREATE POLICY "Users can insert their own business profile" 
    ON public.business_profiles 
    FOR INSERT 
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own business profile" 
    ON public.business_profiles 
    FOR UPDATE 
    USING (auth.uid() = id);

CREATE POLICY "Users can delete their own business profile" 
    ON public.business_profiles 
    FOR DELETE 
    USING (auth.uid() = id);

-- 5. Create RLS Policies for Business Hours
CREATE POLICY "Users can view their own business hours" 
    ON public.business_hours 
    FOR SELECT 
    USING (auth.uid() = id);

CREATE POLICY "Users can insert their own business hours" 
    ON public.business_hours 
    FOR INSERT 
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own business hours" 
    ON public.business_hours 
    FOR UPDATE 
    USING (auth.uid() = id);

CREATE POLICY "Users can delete their own business hours" 
    ON public.business_hours 
    FOR DELETE 
    USING (auth.uid() = id);

-- 6. Optional: Auto Update Timestamp Trigger
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_business_profiles_changetimestamp 
    BEFORE UPDATE ON public.business_profiles 
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_business_hours_changetimestamp 
    BEFORE UPDATE ON public.business_hours 
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();
