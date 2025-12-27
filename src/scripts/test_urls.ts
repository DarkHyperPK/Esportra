import fetch from 'node-fetch';
import * as fs from 'fs';

const urlsToTest = [
    { name: 'Abyss', url: 'https://abbjywqlxnxoutllbgke.supabase.co/storage/v1/object/public/system.assets.website/Valorant%20Maps%20Pictures/Abyss.webp' },
    { name: 'Ascent', url: 'https://abbjywqlxnxoutllbgke.supabase.co/storage/v1/object/public/system.assets.website/Valorant%20Maps%20Pictures/Ascent.webp' },
    { name: 'Bind', url: 'https://abbjywqlxnxoutllbgke.supabase.co/storage/v1/object/public/system.assets.website/Valorant%20Maps%20Pictures/Bind.webp' },
];

async function testUrls() {
    const results = [];

    for (const item of urlsToTest) {
        try {
            const response = await fetch(item.url);
            const status = response.status;
            const contentType = response.headers.get('content-type');
            results.push(`[${status === 200 ? 'OK' : 'FAIL'}] ${item.name}: ${status} ${contentType}`);
        } catch (error) {
            results.push(`[ERROR] ${item.name}: ${error.message}`);
        }
    }

    const output = results.join('\n');
    console.log(output);
    fs.writeFileSync('url_test_result.txt', output);
}

testUrls().catch(console.error);
