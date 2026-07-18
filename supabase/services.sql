-- SERVICES TABLE SQL SCHEMA
-- Paste this script into your Supabase SQL Editor (https://supabase.com)
-- to provision the dynamic services table linked to your authenticated users.

-- 1. Create Services Table
CREATE TABLE IF NOT EXISTS public.services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL,
    price_type TEXT NOT NULL CHECK (price_type IN ('Fixed Price', 'Variable Price', 'Starting From')),
    price NUMERIC NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS Policies for Services
-- Each user can only view, insert, update, or delete their own services

CREATE POLICY "Users can view their own services" 
    ON public.services 
    FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own services" 
    ON public.services 
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own services" 
    ON public.services 
    FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own services" 
    ON public.services 
    FOR DELETE 
    USING (auth.uid() = user_id);

-- 4. Auto Update Timestamp Trigger
CREATE OR REPLACE FUNCTION update_services_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_services_changetimestamp 
    BEFORE UPDATE ON public.services 
    FOR EACH ROW EXECUTE FUNCTION update_services_modified_column();
