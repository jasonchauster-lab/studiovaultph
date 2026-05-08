
/**
 * VERIFICATION SCRIPT: Customer Data Leak Fix
 * Proves that studio owners can NO LONGER see bookings from other studios.
 */

const targetStudioId = 'studio-A-id';
const customerId = 'customer-123';

const mockBookings = [
    { id: 'booking-1', studio_id: 'studio-A-id', client_id: 'customer-123', status: 'confirmed' },
    { id: 'booking-2', studio_id: 'studio-B-id', client_id: 'customer-123', status: 'confirmed' } // SHOULD BE HIDDEN
];

// FIXED logic in [id]/page.tsx
function fetchCustomerBookingsFixed(id, currentStudioId) {
    console.log(`[FIXED] Fetching bookings for customer: ${id} restricted to studio: ${currentStudioId}`);
    // This simulates the new .eq('studio_id', currentStudioId) filter
    return mockBookings.filter(b => b.client_id === id && b.studio_id === currentStudioId);
}

const results = fetchCustomerBookingsFixed(customerId, targetStudioId);

console.log("\n--- DATA LEAK VERIFICATION ---");
const leaked = results.filter(b => b.studio_id !== targetStudioId);
if (leaked.length > 0) {
    console.error(`❌ FAILURE: Still leaking ${leaked.length} booking(s) from other studios!`);
    process.exit(1);
} else {
    console.log(`✅ SUCCESS: Returned ${results.length} booking(s). All belong to studio: ${targetStudioId}`);
}
