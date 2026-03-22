import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wzacmyemiljzpdskyvie.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6YWNteWVtaWxqenBkc2t5dmllIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTIxNTI4OCwiZXhwIjoyMDg2NzkxMjg4fQ.cVVEAR4_EM3ytz4LtPKD8g9RJ__XqI0YTPInPNuDZMI';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("Looking for clubpilatesph@gmail.com...");
  
  // Try profiles or users table
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', 'clubpilatesph@gmail.com')
    .single();
    
  if (profileErr) {
    console.log("Error finding in profiles:", profileErr.message);
  } else {
    console.log("Profile:", profile);
  }

  // Also check auth.users directly if possible, but service role key might be needed
  const { data: users, error: usersErr } = await supabase.auth.admin.listUsers();
  if (usersErr) {
    console.log("Error listing auth users:", usersErr.message);
  } else {
    const user = users.users.find(u => u.email === 'clubpilatesph@gmail.com');
    if (user) {
      console.log("Auth User found:", user.id);
      
  // Find studio
  const { data: studio, error: studioErr } = await supabase
    .from('studios')
    .select('*')
    .eq('owner_id', profile.id)
    .single();

  if (studioErr || !studio) {
    console.log("Error finding studio:", studioErr?.message || "Not found");
    return;
  }
  
  console.log("Found studio:", studio.id, "Name:", studio.name);

  // Fetch tables
  const { data: tables, error: tableErr } = await supabase.rpc('get_studio_earnings_v2', {
    p_studio_id: studio.id,
    p_start_date: null,
    p_end_date: null
  });
  
  if (tableErr) {
    console.log("Error finding earnings:", tableErr.message);
  } else {
    // console.log("Transactions from RPC:", JSON.stringify(tables.transactions, null, 2));
    const txs = tables.transactions || [];
    console.log("Found", txs.length, "transactions via RPC");
    
    // Sum them up
    let total = 0;
    for (const t of txs) {
      if (t.type !== 'Payout' && t.type !== 'Penalty' && t.type !== 'Compensation') {
         total += Number(t.amount || 0);
      }
      console.log(`- [${t.date || t.tx_date}] ${t.type} | Amount: ${t.amount} | Status: ${t.status} | Client: ${t.client}`);
    }
    console.log("Total from RPC transactions (naive sum):", total);
    console.log("Summary:", tables.summary);
  }

  // Check top ups
  const { data: topups, error: topErr } = await supabase
    .from('wallet_top_ups')
    .select('*')
    .eq('user_id', user.id);

  if (topErr) {
    console.log("Topups error:", topErr.message);
  } else {
    console.log("Found", topups.length, "topups/adjustments:");
    for (const t of topups) {
      console.log(`- ${t.type} | Amount: ${t.amount} | Status: ${t.status} | Date: ${t.created_at}`);
    }
  }
    }
  }
}

main().catch(console.error);
