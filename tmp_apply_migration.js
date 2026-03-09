const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function run() {
    try {
        console.log('1. Adding studio_id column...');
        const r1 = await supabase.rpc('exec_sql', { sql_query: 'ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS studio_id UUID REFERENCES public.studios(id);' });
        console.log('R1:', r1);

        console.log('2. Indexing...');
        const r2 = await supabase.rpc('exec_sql', { sql_query: 'CREATE INDEX IF NOT EXISTS idx_bookings_studio_id ON public.bookings(studio_id);' });
        console.log('R2:', r2);

        console.log('3. Backfilling...');
        const r3 = await supabase.rpc('exec_sql', { sql_query: 'UPDATE public.bookings b SET studio_id = s.studio_id FROM public.slots s WHERE b.slot_id = s.id AND b.studio_id IS NULL;' });
        console.log('R3:', r3);

        console.log('4. Updating RLS (Select)...');
        const r4 = await supabase.rpc('exec_sql', { sql_query: 'DROP POLICY IF EXISTS "Users view own bookings" ON public.bookings;' });
        console.log('R4:', r4);
        const r5 = await supabase.rpc('exec_sql', { sql_query: 'CREATE POLICY "Users view own bookings" ON public.bookings FOR SELECT TO authenticated USING (auth.uid() = client_id OR auth.uid() = instructor_id OR EXISTS (SELECT 1 FROM public.studios WHERE id = bookings.studio_id AND owner_id = auth.uid()));' });
        console.log('R5:', r5);

        console.log('5. Updating RLS (Update)...');
        const r6 = await supabase.rpc('exec_sql', { sql_query: 'DROP POLICY IF EXISTS "Participants update relevant bookings" ON public.bookings;' });
        console.log('R6:', r6);
        const r7 = await supabase.rpc('exec_sql', { sql_query: 'CREATE POLICY "Participants update relevant bookings" ON public.bookings FOR UPDATE TO authenticated USING (auth.uid() = client_id OR auth.uid() = instructor_id OR EXISTS (SELECT 1 FROM public.studios WHERE id = bookings.studio_id AND owner_id = auth.uid()));' });
        console.log('R7:', r7);

        console.log('6. Reloading schema...');
        const r8 = await supabase.rpc('exec_sql', { sql_query: "NOTIFY pgrst, 'reload schema';" });
        console.log('R8:', r8);

        console.log('Migration Complete.');
    } catch (e) {
        console.error('Migration Failed:', e);
    }
}

run();
