const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials in .env.local");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testEquipmentFilter() {
    console.log("--- TESTING PHASE 2 BACKEND LOGIC ---\n");

    // Simulate data coming from the database
    const mockDbAvailabilityBlocks = [
        { id: 1, location_area: "Test City - Studio A", equipment: [] }, // Old behavior / No equipment tags
        { id: 2, location_area: "Test City - Studio B", equipment: ["Reformer", "Tower"] }, // Specific equipment
        { id: 3, location_area: "Test City - Studio C", equipment: ["Cadillac"] }, // Different equipment
        { id: 4, location_area: "Test City - Studio D", equipment: null } // Old behavior / null array
    ];

    const testCases = [
        { requestLoc: "Studio A", requestEq: "Reformer", expectedPass: true, desc: "Testing empty equipment array `[]` (Should fallback to allow everything)" },
        { requestLoc: "Studio B", requestEq: "Reformer", expectedPass: true, desc: "Testing exact equipment match `['Reformer', 'Tower']` against 'Reformer'" },
        { requestLoc: "Studio B", requestEq: "Chair", expectedPass: false, desc: "Testing failed equipment match `['Reformer', 'Tower']` against 'Chair'" },
        { requestLoc: "Studio D", requestEq: "Cadillac", expectedPass: true, desc: "Testing null equipment `null` (Should fallback to allow everything)" }
    ];

    for (const testCase of testCases) {
        console.log(`\nTEST: ${testCase.desc}`);
        const { requestLoc, requestEq, expectedPass } = testCase;

        let isValidLocationAndEq = false;

        if (mockDbAvailabilityBlocks.length > 0) {
            const studioLocLower = (requestLoc || '').toLowerCase();
            const requestedEqLower = (requestEq || '').toLowerCase();

            isValidLocationAndEq = mockDbAvailabilityBlocks.some(block => {
                const blockLocLower = (block.location_area || '').toLowerCase();
                const locationMatch = !blockLocLower || studioLocLower.includes(blockLocLower) || blockLocLower.includes(studioLocLower);

                // --- THIS IS THE EXACT LOGIC FROM actions.ts ---
                let equipmentMatch = true;
                if (block.equipment && Array.isArray(block.equipment) && block.equipment.length > 0) {
                    equipmentMatch = block.equipment.some((eq) => eq.toLowerCase() === requestedEqLower);
                }

                return locationMatch && equipmentMatch;
            });
        }

        const passText = isValidLocationAndEq ? "PASS" : "FAIL";
        const resultMatch = isValidLocationAndEq === expectedPass ? "✅ CORRECT" : "❌ INCORRECT";

        console.log(`  Requested Loc: "${requestLoc}" | Requested Eq: "${requestEq}"`);
        console.log(`  Result: ${passText} -> ${resultMatch}`);
    }
}

testEquipmentFilter();
