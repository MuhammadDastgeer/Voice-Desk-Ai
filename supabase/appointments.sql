-- APPOINTMENTS TABLE SQL SCHEMA
-- Paste this script into your Supabase SQL Editor (https://supabase.com)
-- to provision the dynamic appointments table linked to your authenticated users.

-- 1. Create Appointments Table
CREATE TABLE IF NOT EXISTS public.appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    customer_name TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    vehicle_year TEXT,
    vehicle_make TEXT,
    vehicle_model TEXT,
    service_id TEXT,
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS Policies for Appointments
-- Each user can only view, insert, update, or delete their own appointments

CREATE POLICY "Users can view their own appointments" 
    ON public.appointments 
    FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own appointments" 
    ON public.appointments 
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own appointments" 
    ON public.appointments 
    FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own appointments" 
    ON public.appointments 
    FOR DELETE 
    USING (auth.uid() = user_id);

-- 4. Auto Update Timestamp Trigger
CREATE OR REPLACE FUNCTION update_appointments_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_appointments_changetimestamp 
    BEFORE UPDATE ON public.appointments 
    FOR EACH ROW EXECUTE FUNCTION update_appointments_modified_column();
