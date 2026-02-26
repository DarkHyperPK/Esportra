import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// CONFIGURATION
const SOURCE_URL = process.env.SOURCE_SUPABASE_URL;
const SOURCE_KEY = process.env.SOURCE_SERVICE_ROLE_KEY;
const TARGET_URL = process.env.TARGET_SUPABASE_URL || 'http://127.0.0.1:54321';
const TARGET_KEY = process.env.TARGET_SERVICE_ROLE_KEY;

const TEMP_DOWNLOAD_DIR = './supabase_storage_sync_temp';

if (!SOURCE_URL || !SOURCE_KEY || !TARGET_KEY) {
    console.error("Missing required environment variables:");
    console.error("- SOURCE_SUPABASE_URL (Production URL)");
    console.error("- SOURCE_SERVICE_ROLE_KEY (Production Service Role Key)");
    console.error("- TARGET_SERVICE_ROLE_KEY (Local Service Role Key from 'npx supabase status')");
    process.exit(1);
}

const sourceClient = createClient(SOURCE_URL, SOURCE_KEY);
const targetClient = createClient(TARGET_URL, TARGET_KEY);

const buckets = [
    "users.avatars", "users.uploads", "tournaments.banners", "tournaments.results",
    "tournaments.media", "tournaments.disputes.evidence", "teams.logos",
    "venues.images", "venues.layouts", "system.assets.games", "system.assets.sponsors",
    "system.notifications.attachments", "system.temp", "system.assets.website",
    "organizer-banners", "organizer-media", "users.documents.kyc", "venue-images",
    "system.assets.partners"
];

async function syncStorage() {
    console.log("🚀 Starting Full Storage Sync (Prod -> Local)...");

    if (!fs.existsSync(TEMP_DOWNLOAD_DIR)) {
        fs.mkdirSync(TEMP_DOWNLOAD_DIR);
    }

    for (const bucket of buckets) {
        console.log(`\n📦 Processing bucket: ${bucket}`);
        await syncFolder(bucket, "");
    }

    console.log("\n✅ All storage files synced successfully!");
}

async function syncFolder(bucket, folderPath) {
    const { data: files, error } = await sourceClient.storage.from(bucket).list(folderPath);

    if (error) {
        console.error(`Error listing files in Source ${bucket}/${folderPath}:`, error.message);
        return;
    }

    for (const file of files) {
        const fullPath = folderPath ? `${folderPath}/${file.name}` : file.name;

        if (file.id === null) {
            // It's a folder
            await syncFolder(bucket, fullPath);
        } else {
            // It's a file
            console.log(`   Transferring: ${fullPath} ...`);

            // 1. Download from Source
            const { data, error: downloadError } = await sourceClient.storage.from(bucket).download(fullPath);

            if (downloadError) {
                console.error(`      ❌ Failed Download ${fullPath}:`, downloadError.message);
                continue;
            }

            // 2. Upload to Target
            const { error: uploadError } = await targetClient.storage.from(bucket).upload(fullPath, data, {
                upsert: true,
                contentType: file.metadata?.mimetype
            });

            if (uploadError) {
                console.error(`      ❌ Failed Upload ${fullPath}:`, uploadError.message);
            } else {
                console.log(`      ✅ Success`);
            }
        }
    }
}

syncStorage().catch(console.error);
