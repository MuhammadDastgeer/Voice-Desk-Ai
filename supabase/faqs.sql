-- FAQS TABLE SQL SCHEMA
-- Paste this script into your Supabase SQL Editor (https://supabase.com)
-- to provision the dynamic faqs table linked to your authenticated users.

-- 1. Create FAQs Table
CREATE TABLE IF NOT EXISTS public.faqs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'General',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS Policies for FAQs
-- Each user can only view, insert, update, or delete their own FAQs

CREATE POLICY "Users can view their own faqs" 
    ON public.faqs 
    FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own faqs" 
    ON public.faqs 
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own faqs" 
    ON public.faqs 
    FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own faqs" 
    ON public.faqs 
    FOR DELETE 
    USING (auth.uid() = user_id);

-- 4. Auto Update Timestamp Trigger
CREATE OR REPLACE FUNCTION update_faqs_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_faqs_changetimestamp 
    BEFORE UPDATE ON public.faqs 
    FOR EACH ROW EXECUTE FUNCTION update_faqs_modified_column();
