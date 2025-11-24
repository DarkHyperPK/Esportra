/**
 * Storage Bucket Migration Script
 * 
 * This script migrates files from old bucket names to new domain-based bucket names.
 * Run this script after creating new buckets and before deleting old ones.
 * 
 * Usage:
 *   npx tsx scripts/migrate-storage-buckets.ts
 * 
 * Or with Node:
 *   node --loader ts-node/esm scripts/migrate-storage-buckets.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('Required: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Bucket mapping: old name -> new name
const BUCKET_MAPPING: Record<string, string> = {
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

interface MigrationStats {
  bucket: string;
  totalFiles: number;
  migrated: number;
  failed: number;
  errors: string[];
}

async function listAllFiles(bucketName: string): Promise<string[]> {
  const files: string[] = [];
  let pageToken: string | null = null;

  try {
    do {
      const { data, error } = await supabase.storage
        .from(bucketName)
        .list('', {
          limit: 1000,
          offset: files.length,
          sortBy: { column: 'name', order: 'asc' },
        });

      if (error) {
        console.error(`❌ Error listing files in ${bucketName}:`, error.message);
        return files;
      }

      if (data) {
        const fileNames = data
          .filter(item => item.id !== null) // Filter out folders
          .map(item => item.name);
        files.push(...fileNames);
      }

      // Check if there are more files
      if (data && data.length < 1000) {
        break;
      }
    } while (true);
  } catch (error: any) {
    console.error(`❌ Error listing files in ${bucketName}:`, error.message);
  }

  return files;
}

async function copyFile(
  oldBucket: string,
  newBucket: string,
  fileName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Download file from old bucket
    const { data: fileData, error: downloadError } = await supabase.storage
      .from(oldBucket)
      .download(fileName);

    if (downloadError) {
      return { success: false, error: `Download failed: ${downloadError.message}` };
    }

    if (!fileData) {
      return { success: false, error: 'No file data received' };
    }

    // Get file metadata
    const { data: fileInfo } = await supabase.storage
      .from(oldBucket)
      .list(path.dirname(fileName) || '', {
        search: path.basename(fileName),
      });

    const contentType = fileInfo?.[0]?.metadata?.mimetype || 'application/octet-stream';

    // Upload to new bucket
    const { error: uploadError } = await supabase.storage
      .from(newBucket)
      .upload(fileName, fileData, {
        contentType,
        upsert: false, // Don't overwrite existing files
      });

    if (uploadError) {
      // If file already exists, that's okay
      if (uploadError.message.includes('already exists')) {
        return { success: true };
      }
      return { success: false, error: `Upload failed: ${uploadError.message}` };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function migrateBucket(oldBucket: string, newBucket: string): Promise<MigrationStats> {
  console.log(`\n📦 Migrating ${oldBucket} → ${newBucket}...`);

  const stats: MigrationStats = {
    bucket: oldBucket,
    totalFiles: 0,
    migrated: 0,
    failed: 0,
    errors: [],
  };

  try {
    // List all files in old bucket
    console.log(`  📋 Listing files in ${oldBucket}...`);
    const files = await listAllFiles(oldBucket);
    stats.totalFiles = files.length;

    if (files.length === 0) {
      console.log(`  ✅ No files to migrate in ${oldBucket}`);
      return stats;
    }

    console.log(`  📁 Found ${files.length} files`);

    // Migrate each file
    for (let i = 0; i < files.length; i++) {
      const fileName = files[i];
      const progress = `[${i + 1}/${files.length}]`;

      process.stdout.write(`  ${progress} Migrating ${fileName}... `);

      const result = await copyFile(oldBucket, newBucket, fileName);

      if (result.success) {
        stats.migrated++;
        console.log('✅');
      } else {
        stats.failed++;
        stats.errors.push(`${fileName}: ${result.error}`);
        console.log(`❌ ${result.error}`);
      }

      // Small delay to avoid rate limiting
      if (i < files.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log(`\n  📊 Migration Summary for ${oldBucket}:`);
    console.log(`     Total: ${stats.totalFiles}`);
    console.log(`     Migrated: ${stats.migrated} ✅`);
    console.log(`     Failed: ${stats.failed} ${stats.failed > 0 ? '❌' : ''}`);

    if (stats.errors.length > 0 && stats.errors.length <= 10) {
      console.log(`\n  ⚠️  Errors:`);
      stats.errors.forEach(err => console.log(`     - ${err}`));
    } else if (stats.errors.length > 10) {
      console.log(`\n  ⚠️  ${stats.errors.length} errors (showing first 10):`);
      stats.errors.slice(0, 10).forEach(err => console.log(`     - ${err}`));
    }

  } catch (error: any) {
    console.error(`  ❌ Fatal error migrating ${oldBucket}:`, error.message);
    stats.errors.push(`Fatal: ${error.message}`);
  }

  return stats;
}

async function verifyMigration(oldBucket: string, newBucket: string): Promise<boolean> {
  console.log(`\n🔍 Verifying migration ${oldBucket} → ${newBucket}...`);

  const oldFiles = await listAllFiles(oldBucket);
  const newFiles = await listAllFiles(newBucket);

  const missingFiles = oldFiles.filter(file => !newFiles.includes(file));

  if (missingFiles.length === 0) {
    console.log(`  ✅ All ${oldFiles.length} files migrated successfully`);
    return true;
  } else {
    console.log(`  ⚠️  ${missingFiles.length} files missing in new bucket:`);
    missingFiles.slice(0, 10).forEach(file => console.log(`     - ${file}`));
    if (missingFiles.length > 10) {
      console.log(`     ... and ${missingFiles.length - 10} more`);
    }
    return false;
  }
}

async function main() {
  console.log('🚀 Starting Storage Bucket Migration\n');
  console.log('=' .repeat(60));

  const allStats: MigrationStats[] = [];
  const verificationResults: Record<string, boolean> = {};

  // Migrate each bucket
  for (const [oldBucket, newBucket] of Object.entries(BUCKET_MAPPING)) {
    const stats = await migrateBucket(oldBucket, newBucket);
    allStats.push(stats);

    // Verify migration
    if (stats.totalFiles > 0) {
      const verified = await verifyMigration(oldBucket, newBucket);
      verificationResults[oldBucket] = verified;
    } else {
      verificationResults[oldBucket] = true; // No files to verify
    }
  }

  // Final summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 FINAL MIGRATION SUMMARY\n');

  const totalFiles = allStats.reduce((sum, s) => sum + s.totalFiles, 0);
  const totalMigrated = allStats.reduce((sum, s) => sum + s.migrated, 0);
  const totalFailed = allStats.reduce((sum, s) => sum + s.failed, 0);

  console.log(`Total Files: ${totalFiles}`);
  console.log(`Migrated: ${totalMigrated} ✅`);
  console.log(`Failed: ${totalFailed} ${totalFailed > 0 ? '❌' : ''}`);

  const allVerified = Object.values(verificationResults).every(v => v);
  console.log(`\nVerification: ${allVerified ? '✅ All buckets verified' : '⚠️  Some buckets need attention'}`);

  if (allVerified && totalFailed === 0) {
    console.log('\n✅ Migration completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('   1. Test your application to ensure everything works');
    console.log('   2. Keep old buckets for a few days as backup');
    console.log('   3. Delete old buckets after verification');
    console.log('\n⚠️  To delete old buckets, run:');
    console.log('   DELETE FROM storage.buckets WHERE id IN (');
    Object.keys(BUCKET_MAPPING).forEach(bucket => {
      console.log(`     '${bucket}',`);
    });
    console.log('   );');
  } else {
    console.log('\n⚠️  Migration completed with issues. Please review errors above.');
    console.log('   Do not delete old buckets until all issues are resolved.');
  }
}

main().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});

