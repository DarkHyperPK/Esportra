import { supabase } from '@/lib/supabase';

export async function testSupabaseConnection() {
  console.log("🔍 Testing Supabase connection...");
  
  try {
    // Test 1: Simple profile count
    console.log("Testing profiles table...");
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('count', { count: 'exact', head: true });

    if (profilesError) {
      console.error("❌ Profiles error:", profilesError);
      return false;
    }
    console.log("✅ Profiles table accessible, count:", profiles);

    // Test 2: Simple teams count
    console.log("Testing teams table...");
    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select('count', { count: 'exact', head: true });

    if (teamsError) {
      console.error("❌ Teams error:", teamsError);
      return false;
    }
    console.log("✅ Teams table accessible, count:", teams);

    // Test 3: Simple tournaments count
    console.log("Testing tournaments table...");
    const { data: tournaments, error: tournamentsError } = await supabase
      .from('tournaments')
      .select('count', { count: 'exact', head: true });

    if (tournamentsError) {
      console.error("❌ Tournaments error:", tournamentsError);
      return false;
    }
    console.log("✅ Tournaments table accessible, count:", tournaments);

    console.log("🎉 All basic table tests passed!");
    return true;

  } catch (error: any) {
    console.error("❌ Connection test failed:", error);
    return false;
  }
}
