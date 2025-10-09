-- Company Profiles Migration
-- Run this in your Supabase SQL editor

-- Create company_profiles table
CREATE TABLE IF NOT EXISTS company_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name VARCHAR(255) NOT NULL,
  company_logo TEXT DEFAULT NULL,
  company_description TEXT DEFAULT NULL,
  website VARCHAR(255) DEFAULT NULL,
  contact_email VARCHAR(255) DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one company profile per user
  UNIQUE(user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_company_profiles_user_id ON company_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_company_profiles_company_name ON company_profiles(company_name);

-- Create updated_at trigger for company_profiles
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_company_profiles_updated_at 
    BEFORE UPDATE ON company_profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE company_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for company_profiles
CREATE POLICY "Users can view their own company profile" ON company_profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own company profile" ON company_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own company profile" ON company_profiles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own company profile" ON company_profiles
    FOR DELETE USING (auth.uid() = user_id);

-- Allow public read access to company profiles (for tournament display)
CREATE POLICY "Public can view company profiles" ON company_profiles
    FOR SELECT USING (true);

-- Grant necessary permissions
GRANT ALL ON company_profiles TO authenticated;
GRANT SELECT ON company_profiles TO anon;
