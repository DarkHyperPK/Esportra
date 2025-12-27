
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

// Polyfill fetch for Node environment
if (!global.fetch) {
    (global as any).fetch = fetch;
    (global as any).Headers = (fetch as any).Headers;
    (global as any).Request = (fetch as any).Request;
    (global as any).Response = (fetch as any).Response;
}

// Load environment variables if .env exists
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://ggmoxgiddhhvimbdolsl.supabase.co";
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdnbW94Z2lkZGhodmltYmRvbHNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU2NjMwMjksImV4cCI6MjA2MTIzOTAyOX0.yqJtUwPNueSYOrB4Mi2ClVcCaDSyzT3G_RSYt9U2F7o";

console.log('Using Supabase URL:', SUPABASE_URL);

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        persistSession: false
    },
    global: {
        fetch: fetch as any
    }
});

const mapsToUpdate = [
    { name: 'Abyss', url: 'https://abbjywqlxnxoutllbgke.supabase.co/storage/v1/object/public/system.assets.website/Valorant%20Maps%20Pictures/Abyss.webp' },
    { name: 'Ascent', url: 'https://abbjywqlxnxoutllbgke.supabase.co/storage/v1/object/public/system.assets.website/Valorant%20Maps%20Pictures/Ascent.webp' },
    { name: 'Bind', url: 'https://abbjywqlxnxoutllbgke.supabase.co/storage/v1/object/public/system.assets.website/Valorant%20Maps%20Pictures/Bind.webp' },
    { name: 'Breeze', url: 'https://abbjywqlxnxoutllbgke.supabase.co/storage/v1/object/public/system.assets.website/Valorant%20Maps%20Pictures/Breeze.webp' },
    { name: 'Corrode', url: 'https://abbjywqlxnxoutllbgke.supabase.co/storage/v1/object/public/system.assets.website/Valorant%20Maps%20Pictures/Corrode.webp' },
    { name: 'Fracture', url: 'https://abbjywqlxnxoutllbgke.supabase.co/storage/v1/object/public/system.assets.website/Valorant%20Maps%20Pictures/Fracture.webp' },
    { name: 'Haven', url: 'https://abbjywqlxnxoutllbgke.supabase.co/storage/v1/object/public/system.assets.website/Valorant%20Maps%20Pictures/haven.jpg' },
    { name: 'Icebox', url: 'https://abbjywqlxnxoutllbgke.supabase.co/storage/v1/object/public/system.assets.website/Valorant%20Maps%20Pictures/Icebox.webp' },
    { name: 'Lotus', url: 'https://abbjywqlxnxoutllbgke.supabase.co/storage/v1/object/public/system.assets.website/Valorant%20Maps%20Pictures/Lotus.webp' },
    { name: 'Pearl', url: 'https://abbjywqlxnxoutllbgke.supabase.co/storage/v1/object/public/system.assets.website/Valorant%20Maps%20Pictures/pearl.jpg' },
    { name: 'Split', url: 'https://abbjywqlxnxoutllbgke.supabase.co/storage/v1/object/public/system.assets.website/Valorant%20Maps%20Pictures/split.jpg' },
    { name: 'Sunset', url: 'https://abbjywqlxnxoutllbgke.supabase.co/storage/v1/object/public/system.assets.website/Valorant%20Maps%20Pictures/Sunset.webp' },
];

async function updateMaps() {
    console.log('Starting map updates...');

    for (const map of mapsToUpdate) {
        console.log(`Updating ${map.name}...`);

        // First try to find the map to ensure we have the correct case/name
        const { data: existingMap, error: findError } = await supabase
            .from('game_maps')
            .select('id, map_name')
            .ilike('map_name', map.name) // Case-insensitive match
            .eq('game', 'Valorant')
            .maybeSingle();

        if (findError) {
            console.error(`Error finding map ${map.name}:`, findError.message);
            continue;
        }

        if (!existingMap) {
            console.warn(`Map ${map.name} not found in database.`);
            continue;
        }

        // Update the map
        const { error: updateError } = await supabase
            .from('game_maps')
            .update({ map_image_url: map.url })
            .eq('id', existingMap.id);

        if (updateError) {
            console.error(`Error updating ${map.name}:`, updateError.message);
        } else {
            console.log(`✅ Updated ${existingMap.map_name} successfully.`);
        }
    }

    console.log('Map updates completed.');
}

updateMaps().catch(e => {
    console.error('Script failed:', e);
    if (e.cause) console.error('Cause:', e.cause);
});
