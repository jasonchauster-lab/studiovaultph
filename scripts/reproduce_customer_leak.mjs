
/**
 * REPRODUCTION SCRIPT: Customer Data Leak
 * Proves that studio owners can see bookings from other studios for a given customer.
 */

const targetStudioId = 'studio-A-id';
const customerId = 'customer-123';

const mockBookings = [
    { id: 'booking-1', studio_id: 'studio-A-id', client_id: 'customer-123', status: 'confirmed' },
    { id: 'booking-2', studio_id: 'studio-B-id', client_id: 'customer-123', status: 'confirmed' } // SHOULD BE HIDDEN
];

// Current logic in [id]/page.tsx (L30-40)
function fetchCustomerBookingsBuggy(id, currentStudioId) {
    console.log(`[BUGGY] Fetching bookings for customer: ${id}`);
    // This simulates the missing .eq('studio_id', currentStudioId) filter in the existing code
    return mockBookings.filter(b => b.client_id === id);
}

const results = fetchCustomerBookingsBuggy(customerId, targetStudioId);

console.log("\n--- DATA LEAK REPRODUCTION ---");
const leaked = results.filter(b => b.studio_id !== targetStudioId);
if (leaked.length > 0) {
    console.error(`❌ FAILURE: Leaked ${leaked.length} booking(s) from other studios!`);
    console.log("Leaked Booking IDs:", leaked.map(b => b.id).join(', '));
    process.exit(1);
} else {
    console.log("✅ Success: No data leak detected.");
}
