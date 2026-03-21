// Test Supabase connection
import { supabase } from '@/lib/supabase';

export const testSupabaseConnection = async () => {
  // console.log('🔍 Testing Supabase connection...');

  try {
    // Test 1: Check if we can connect to Supabase
    // console.log('📡 Supabase URL:', supabase.supabaseUrl);
    // console.log('🔑 API Key present:', !!supabase.supabaseKey);

    // Test 2: Try to get session (this will fail if URL is wrong)
    const { data: session, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
      console.error('❌ Session error:', sessionError.message);
      return false;
    }

    // console.log('✅ Session check passed');

    // Test 3: Try to query a table (this will fail if migration hasn't run)
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);

    if (profilesError) {
      console.error('❌ Database error:', profilesError.message);
      console.log('💡 This might mean the migration hasn\'t been run yet');
      return false;
    }

    // console.log('✅ Database query passed');
    // console.log('🎉 Supabase connection is working!');
    return true;

  } catch (error) {
    console.error('❌ Connection test failed:', error);
    return false;
  }
};

// Auto-run test when imported
testSupabaseConnection();
