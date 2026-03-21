import fetch from 'node-fetch';

const testUrl = 'https://api.esportra.com/storage/v1/object/public/system.assets.website/Valorant%20Maps%20Pictures/Abyss.webp';

async function test() {
    try {
        console.log('Testing URL:', testUrl);
        const response = await fetch(testUrl, {
            method: 'HEAD'
        });
        console.log('Status:', response.status);
        console.log('Headers:', Object.fromEntries(response.headers));
    } catch (error) {
        console.error('Error:', error.message);
    }
}

test();
