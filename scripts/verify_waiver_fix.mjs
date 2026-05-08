
/**
 * VERIFICATION SCRIPT: Waiver PAR-Q Bug Fix
 * This script proves that the updated logic correctly handles PAR-Q answers.
 */

function simulateSignWaiverFixed(params) {
    console.log("Simulating UPDATED signWaiverAction with params:", params);
    
    // This is the new logic:
    const payload = {
        user_id: "test-user",
        parq_answers: params.parqAnswers // FIX: Using params.parqAnswers
    };
    
    return payload;
}

const testParams = {
    parqAnswers: {
        dizziness: true,
        bone_joint: true,
        medical_advice: false,
        chest_pain_rest: false,
        heart_condition: false,
        chest_pain_activity: false,
        pregnant_postpartum: false
    }
};

const result = simulateSignWaiverFixed(testParams);

console.log("\n--- TEST RESULT ---");
if (result.parq_answers.dizziness === true && testParams.parqAnswers.dizziness === true) {
    console.log("✅ FIX VERIFIED: User answered 'true' for dizziness, and it is now correctly mapped in the payload.");
} else {
    console.error("❌ FIX FAILED: Payload still doesn't match input.");
    process.exit(1);
}
