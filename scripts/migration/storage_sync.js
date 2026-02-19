import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// CONFIGURATION
const CLOUD_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; // MUST USE SERVICE ROLE KEY
const DOWNLOAD_DIR = './supabase_storage_backup';

if (!CLOUD_URL || !SERVICE_KEY) {
    console.error("Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
}

const supabase = createClient(CLOUD_URL, SERVICE_KEY);

const buckets = [
    "users.avatars", "users.uploads", "tournaments.banners", "tournaments.results",
    "tournaments.media", "tournaments.disputes.evidence", "teams.logos",
    "venues.images", "venues.layouts", "system.assets.games", "system.assets.sponsors",
    "system.notifications.attachments", "system.temp", "system.assets.website",
    "organizer-banners", "organizer-media", "users.documents.kyc", "venue-images"
];

async function syncStorage() {
    console.log("🚀 Starting Storage Sync...");

    if (!fs.existsSync(DOWNLOAD_DIR)) {
        fs.mkdirSync(DOWNLOAD_DIR);
    }

    for (const bucket of buckets) {
        console.log(`\n📦 Syncing bucket: ${bucket}`);
        const bucketDir = path.join(DOWNLOAD_DIR, bucket);
        if (!fs.existsSync(bucketDir)) fs.mkdirSync(bucketDir, { recursive: true });

        await downloadFolder(bucket, "");
    }

    console.log("\n✅ Storage Sync Complete!");
}

async function downloadFolder(bucket, folderPath) {
    const { data: files, error } = await supabase.storage.from(bucket).list(folderPath);

    if (error) {
        console.error(`Error listing files in ${bucket}/${folderPath}:`, error.message);
        return;
    }

    for (const file of files) {
        const fullPath = folderPath ? `${folderPath}/${file.name}` : file.name;

        if (file.id === null) {
            // It's a folder (Supabase storage convention)
            const localFolderPath = path.join(DOWNLOAD_DIR, bucket, fullPath);
            if (!fs.existsSync(localFolderPath)) fs.mkdirSync(localFolderPath, { recursive: true });
            await downloadFolder(bucket, fullPath);
        } else {
            // It's a file
            console.log(`   Downloading: ${fullPath}`);
            const { data, error: downloadError } = await supabase.storage.from(bucket).download(fullPath);

            if (downloadError) {
                console.error(`      ❌ Failed ${fullPath}:`, downloadError.message);
                continue;
            }

            const buffer = Buffer.from(await data.arrayBuffer());
            const localFilePath = path.join(DOWNLOAD_DIR, bucket, fullPath);

            // Ensure directory exists
            fs.mkdirSync(path.dirname(localFilePath), { recursive: true });
            fs.writeFileSync(localFilePath, buffer);
        }
    }
}

syncStorage().catch(console.error);
