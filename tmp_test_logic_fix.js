const getSlotDateTime = (date, time) => {
    return new Date(`${date}T${time}+08:00`);
};

const now = new Date();
console.log(`Current Time (System): ${now.toISOString()}`);

const testBookings = [
    {
        id: 'upcoming-test',
        status: 'approved',
        slots: {
            date: '2026-03-08',
            start_time: '07:00:00',
            end_time: '08:00:00'
        }
    },
    {
        id: 'past-test',
        status: 'approved',
        slots: {
            date: '2026-03-01',
            start_time: '07:00:00',
            end_time: '08:00:00'
        }
    }
];

console.log('\n--- Filtering Results ---');

const upcoming = testBookings.filter(b => getSlotDateTime(b.slots.date, b.slots.start_time) > now);
const past = testBookings.filter(b => getSlotDateTime(b.slots.date, b.slots.start_time) <= now);

console.log('Upcoming Bookings:');
upcoming.forEach(b => console.log(`- ${b.id} (${b.slots.date} ${b.slots.start_time})`));

console.log('\nPast Bookings:');
past.forEach(b => console.log(`- ${b.id} (${b.slots.date} ${b.slots.start_time})`));

console.log('\n--- Review Eligibility Test ---');
testBookings.forEach(b => {
    const slotEnd = getSlotDateTime(b.slots.date, b.slots.end_time);
    const isPast = slotEnd < now;
    const canReview = b.status === 'approved' && isPast;
    console.log(`Booking ${b.id}: isPast=${isPast}, canReview=${canReview}`);
});
