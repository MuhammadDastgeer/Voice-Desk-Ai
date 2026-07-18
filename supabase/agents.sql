-- AGENTS TABLE SQL SCHEMA
-- Paste this script into your Supabase SQL Editor (https://supabase.com)
-- to provision the dynamic agents table linked to your authenticated users.

-- 1. Create Agents Table
CREATE TABLE IF NOT EXISTS public.agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    voice TEXT NOT NULL DEFAULT 'Alloy - Neutral',
    personality TEXT NOT NULL DEFAULT 'Professional',
    interruption_sensitivity TEXT NOT NULL DEFAULT 'Medium',
    greeting_message TEXT NOT NULL,
    system_prompt TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    type TEXT NOT NULL DEFAULT 'voice',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS Policies for Agents
-- Each user can only view, insert, update, or delete their own Agents

CREATE POLICY "Users can view their own agents" 
    ON public.agents 
    FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own agents" 
    ON public.agents 
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own agents" 
    ON public.agents 
    FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own agents" 
    ON public.agents 
    FOR DELETE 
    USING (auth.uid() = user_id);

-- 4. Auto Update Timestamp Trigger
CREATE OR REPLACE FUNCTION update_agents_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_agents_changetimestamp 
    BEFORE UPDATE ON public.agents 
    FOR EACH ROW EXECUTE FUNCTION update_agents_modified_column();
