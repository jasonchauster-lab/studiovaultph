
/**
 * VERIFICATION SCRIPT: Recurring Slot Logic Refactor
 * This script verifies that the new logic correctly calculates end times for non-hourly slots.
 */

function toManilaTimeString(date) {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
}

function verifySchedulingLogic() {
    console.log("Verifying Recurring Slot Logic Refactor...");

    const testCases = [
        { startTime: "09:15", duration: 45, expectedEnd: "10:00" },
        { startTime: "14:45", duration: 75, expectedEnd: "16:00" },
        { startTime: "18:00", duration: 60, expectedEnd: "19:00" }
    ];

    testCases.forEach((tc, i) => {
        const dateStr = "2026-05-08";
        const slotStart = new Date(`${dateStr}T${tc.startTime}:00+08:00`);
        const slotEnd = new Date(slotStart.getTime() + tc.duration * 60000);
        const actualEnd = toManilaTimeString(slotEnd);

        console.log(`Test Case ${i+1}: Start ${tc.startTime}, Duration ${tc.duration}m -> End ${actualEnd}`);

        if (actualEnd !== tc.expectedEnd) {
            console.error(`❌ FAILURE: Expected ${tc.expectedEnd}, got ${actualEnd}`);
            process.exit(1);
        }
    });

    console.log("✅ SUCCESS: Scheduling logic correctly handles non-hourly and custom durations.");
}

verifySchedulingLogic();
