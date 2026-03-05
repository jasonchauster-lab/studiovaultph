const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    'https://wzacmyemiljzpdskyvie.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6YWNteWVtaWxqenBkc2t5dmllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyMTUyODgsImV4cCI6MjA4Njc5MTI4OH0.BGxtSbYjz5_cNoJhHyigwY7Pqv0NAP2gz0uNHHFPqTU'
);

async function testAnonRead() {
    const { data, error } = await supabase.from('profiles').select('id, role').limit(5);
    console.log('Anon Read Result:', { data, error });
}

testAnonRead();
