
// Simulate the logic in StudioScheduleCalendar.tsx
const eq = "REFORMER";
const count = 1;

// Mock slots with bookings
const bookings = [
    {
        id: "3cc7d783-b63a-4b35-8530-b8a14dd12331",
        status: "approved",
        price_breakdown: { equipment: "REFORMER", quantity: 1 }
    }
];

// Calculation logic from the component
const bookedForThisEq = bookings.filter(b =>
    ['approved', 'pending', 'completed'].includes(b.status?.toLowerCase() || '') &&
    (b.price_breakdown?.equipment?.toUpperCase() === eq.toUpperCase() || b.equipment?.toUpperCase() === eq.toUpperCase())
).length || 0;

const free = Math.max(0, count - bookedForThisEq);

console.log(`Original Count: ${count}`);
console.log(`Booked Count: ${bookedForThisEq}`);
console.log(`Free Count: ${free}`);

if (free === 0) {
    console.log("SUCCESS: Equipment correctly identified as booked (0 free).");
} else {
    console.log("FAILURE: Equipment still showing as free.");
}
