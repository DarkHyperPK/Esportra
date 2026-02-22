const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.production' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function renameAssets() {
    console.log('Fetching files...');
    const { data: files, error } = await supabase.storage.from('system.assets.website').list('', { limit: 100 });

    if (error) {
        console.error('Error listing files:', error);
        return;
    }

    // Also fetch files in subdirectories (it's flat in the query actually, or we need to search subdirs)
    // Supabase list() only returns current directory. Let's recursively find files with spaces.
    let allPaths = [];
    async function listDirs(path) {
        const { data } = await supabase.storage.from('system.assets.website').list(path, { limit: 100 });
        if (!data) return;
        for (const item of data) {
            const fullPath = path ? `${path}/${item.name}` : item.name;
            // .emptyFolderPlaceholder has no id, it's just a placeholder, ignore it
            if (!item.id && item.name === '.emptyFolderPlaceholder') continue;

            if (!item.id) {
                // It's a folder
                await listDirs(fullPath);
            } else {
                allPaths.push(fullPath);
            }
        }
    }

    await listDirs('');
    console.log(`Found ${allPaths.length} total files.`);

    const filesWithSpaces = allPaths.filter(p => p.includes(' '));
    console.log(`Found ${filesWithSpaces.length} files with spaces to rename.`);

    for (const oldPath of filesWithSpaces) {
        const newPath = oldPath.replace(/ /g, '-');
        console.log(`Moving: "${oldPath}" -> "${newPath}"`);
        const { data, error } = await supabase.storage.from('system.assets.website').move(oldPath, newPath);
        if (error) {
            console.error(`Failed to move ${oldPath}:`, error.message);
        } else {
            console.log(`Successfully moved to ${newPath}`);
        }
    }
}

renameAssets();
