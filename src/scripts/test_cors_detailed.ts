import fetch from 'node-fetch';

const testUrl = 'https://api.esportra.com/storage/v1/object/public/system.assets.website/Valorant%20Maps%20Pictures/Abyss.webp';

async function testCORS() {
    try {
        console.log('Testing URL:', testUrl);
        console.log('\n=== Response Details ===');

        const response = await fetch(testUrl);

        console.log('Status:', response.status, response.statusText);
        console.log('\n=== CORS Headers ===');
        console.log('Access-Control-Allow-Origin:', response.headers.get('access-control-allow-origin'));
        console.log('Access-Control-Allow-Methods:', response.headers.get('access-control-allow-methods'));
        console.log('Access-Control-Allow-Headers:', response.headers.get('access-control-allow-headers'));

        console.log('\n=== All Headers ===');
        response.headers.forEach((value, key) => {
            console.log(`${key}: ${value}`);
        });

        console.log('\n=== Content Info ===');
        console.log('Content-Type:', response.headers.get('content-type'));
        console.log('Content-Length:', response.headers.get('content-length'));

    } catch (error) {
        console.error('Error:', error.message);
    }
}

testCORS();
