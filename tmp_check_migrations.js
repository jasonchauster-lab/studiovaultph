const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

function getEnv() {
    const envPath = path.join(process.cwd(), '.env.local');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const env = {};
    envContent.split('\n').forEach(line => {
        const [key, ...value] = line.split('=');
        if (key && value) {
            env[key.trim()] = value.join('=').trim();
        }
    });
    return env;
}

const env = getEnv();
const supabase = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkMigrations() {
    console.log('--- CHECKING APPLIED MIGRATIONS ---');

    // Check migrations table
    const { data: migrations, error } = await supabase
        .from('_prisma_migrations') // or supabase_migrations
        .select('*')
        .order('finished_at', { ascending: false });

    if (error) {
        console.warn('Could not find _prisma_migrations, checking supabase_migrations. Error:', error.message);
        const { data: migrations2, error: error2 } = await supabase
            .from('supabase_migrations') // standard name
            .select('*');

        if (error2) {
            console.error('Could not find migrations table. Error:', error2.message);
        } else {
            console.log('Applied Supabase Migrations:', migrations2.map(m => m.version));
        }
    } else {
        console.log('Applied Prisma Migrations:', migrations.map(m => m.migration_name));
    }
}

checkMigrations();
