// Test Supabase connection and basic queries
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://abbjywqlxnxoutllbgke.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiYmp5d3FseG54b3V0bGxiZ2tlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU2NjMwMjksImV4cCI6MjA2MTIzOTAyOX0.yqJtUwPNueSYOrB4Mi2ClVcCaDSyzT3G_RSYt9U2F7o';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log('🔍 Testing Supabase connection...');
  
  try {
    // Test 1: Check profiles table
    console.log('📊 Testing profiles table...');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, username, email, role')
      .limit(5);
    
    if (profilesError) {
      console.error('❌ Profiles error:', profilesError);
    } else {
      console.log('✅ Profiles query successful:', profiles);
    }

    // Test 2: Check teams table
    console.log('📊 Testing teams table...');
    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select('id, name, game')
      .limit(5);
    
    if (teamsError) {
      console.error('❌ Teams error:', teamsError);
    } else {
      console.log('✅ Teams query successful:', teams);
    }

    // Test 3: Check tournaments table
    console.log('📊 Testing tournaments table...');
    const { data: tournaments, error: tournamentsError } = await supabase
      .from('tournaments')
      .select('id, name, game')
      .limit(5);
    
    if (tournamentsError) {
      console.error('❌ Tournaments error:', tournamentsError);
    } else {
      console.log('✅ Tournaments query successful:', tournaments);
    }

    // Test 4: Check specific user profile
    console.log('👤 Testing specific user profile...');
    const { data: userProfile, error: userError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', '6f7da42e-a787-4533-83f4-e06da5c8ce7d')
      .single();
    
    if (userError) {
      console.error('❌ User profile error:', userError);
    } else {
      console.log('✅ User profile found:', userProfile);
    }

    console.log('🎉 All tests completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testConnection();
