import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import * as fs from 'fs';

// Polyfill fetch for Node environment
if (!global.fetch) {
    (global as any).fetch = fetch;
    (global as any).Headers = (fetch as any).Headers;
    (global as any).Request = (fetch as any).Request;
    (global as any).Response = (fetch as any).Response;
}

// Load environment variables
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://ggmoxgiddhhvimbdolsl.supabase.co";
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdnbW94Z2lkZGhodmltYmRvbHNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU2NjMwMjksImV4cCI6MjA2MTIzOTAyOX0.yqJtUwPNueSYOrB4Mi2ClVcCaDSyzT3G_RSYt9U2F7o";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        persistSession: false
    },
    global: {
        fetch: fetch as any
    }
});

async function verifyMaps() {
    const { data, error } = await supabase
        .from('game_maps')
        .select('map_name, map_image_url')
        .eq('game', 'Valorant')
        .order('map_name');

    if (error) {
        console.error('Error:', error);
        fs.writeFileSync('map_verification_error.txt', JSON.stringify(error, null, 2));
        return;
    }

    const output = data.map(m => `${m.map_name}: ${m.map_image_url || 'NULL'}`).join('\n');
    fs.writeFileSync('map_verification_result.txt', output);
    console.log('Results written to map_verification_result.txt');
    console.log(output);
}

verifyMaps().catch(e => {
    console.error('Failed:', e);
    fs.writeFileSync('map_verification_error.txt', e.toString());
});
