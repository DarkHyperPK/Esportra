/**
 * Simple Storage Migration Script
 * Minimal dependencies - just requires @supabase/supabase-js
 * 
 * Usage:
 *   node scripts/migrate-storage-simple.js
 * 
 * Set these environment variables:
 *   VITE_SUPABASE_URL=your_url
 *   SUPABASE_SERVICE_ROLE_KEY=your_key
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const BUCKETS = {
  'user-avatars': 'users.avatars',
  'kyc-documents': 'users.documents.kyc',
  'user-uploads': 'users.uploads',
  'tournament-banners': 'tournaments.banners',
  'tournament-results': 'tournaments.results',
  'tournament-screenshots': 'tournaments.media',
  'dispute-evidence': 'tournaments.disputes.evidence',
  'team-logos': 'teams.logos',
  'venue-images': 'venues.images',
  'venue-layouts': 'venues.layouts',
  'game-assets': 'system.assets.games',
  'website-assets': 'system.assets.website',
  'sponsor-logos': 'system.assets.sponsors',
  'notification-attachments': 'system.notifications.attachments',
  'temp-uploads': 'system.temp',
};

async function migrate() {
  console.log('🚀 Starting migration...\n');

  for (const [oldBucket, newBucket] of Object.entries(BUCKETS)) {
    console.log(`📦 ${oldBucket} → ${newBucket}`);
    
    try {
      // List files
      const { data: files, error: listError } = await supabase.storage
        .from(oldBucket)
        .list('', { limit: 1000, sortBy: { column: 'name', order: 'asc' } });

      if (listError) {
        console.log(`   ⚠️  Error: ${listError.message}\n`);
        continue;
      }

      if (!files || files.length === 0) {
        console.log(`   ✅ Empty bucket\n`);
        continue;
      }

      console.log(`   📁 Found ${files.length} files`);

      let migrated = 0;
      let failed = 0;

      for (const file of files) {
        if (!file.name) continue;

        try {
          // Download
          const { data: fileData, error: downloadError } = await supabase.storage
            .from(oldBucket)
            .download(file.name);

          if (downloadError) {
            console.log(`   ❌ ${file.name}: ${downloadError.message}`);
            failed++;
            continue;
          }

          // Upload
          const { error: uploadError } = await supabase.storage
            .from(newBucket)
            .upload(file.name, fileData, { upsert: false });

          if (uploadError && !uploadError.message.includes('already exists')) {
            console.log(`   ❌ ${file.name}: ${uploadError.message}`);
            failed++;
          } else {
            migrated++;
            process.stdout.write('.');
          }
        } catch (error) {
          console.log(`\n   ❌ ${file.name}: ${error.message}`);
          failed++;
        }
      }

      console.log(`\n   ✅ Migrated: ${migrated}, Failed: ${failed}\n`);
    } catch (error) {
      console.log(`   ❌ Fatal: ${error.message}\n`);
    }
  }

  console.log('✅ Migration complete!');
}

migrate().catch(console.error);

