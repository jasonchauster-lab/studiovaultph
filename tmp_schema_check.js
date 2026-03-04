const fs = require('fs');
const readline = require('readline');

async function processLineByLine() {
    const fileStream = fs.createReadStream('.env.local');

    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    let url, key;
    for await (const line of rl) {
        if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) url = line.split('=')[1];
        if (line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) key = line.split('=')[1];
    }

    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(url, key);

    // Use a hack to get the schema by triggering an error or looking at the PostgREST openapi spec
    const res = await fetch(`${url}/rest/v1/?apikey=${key}`);
    const json = await res.json();
    console.log(JSON.stringify(json.definitions.messages, null, 2));
}

processLineByLine();
