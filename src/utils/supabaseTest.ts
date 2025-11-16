// Simple Supabase connection test
import { supabase } from '@/lib/supabase';

export const testSupabaseConnection = async () => {
  try {
    console.log('Testing Supabase connection...');
    console.log('Supabase URL:', supabase.supabaseUrl);
    console.log('Supabase Key:', supabase.supabaseKey ? 'Present' : 'Missing');
    
    // Test a simple query
    const { data, error } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('Supabase connection error:', error);
      return false;
    }
    
    console.log('Supabase connection successful!');
    return true;
  } catch (err) {
    console.error('Supabase connection failed:', err);
    return false;
  }
};

// Test the connection on import
testSupabaseConnection();
