
/**
 * REPRODUCTION SCRIPT: Waiver PAR-Q Bug
 * This script proves that the current signWaiverAction logic hardcodes PAR-Q answers.
 */

const currentHardcodedAnswers = {
    dizziness: false,
    bone_joint: false,
    medical_advice: false,
    chest_pain_rest: false,
    heart_condition: false,
    chest_pain_activity: false,
    pregnant_postpartum: false
};

function simulateSignWaiver(params) {
    console.log("Simulating signWaiverAction with params:", params);
    
    // This is what the current code does:
    const payload = {
        user_id: "test-user",
        parq_answers: currentHardcodedAnswers // BUG: Ignoring params.parqAnswers
    };
    
    return payload;
}

const testParams = {
    parqAnswers: {
        dizziness: true, // User says YES to dizziness
        bone_joint: true
    }
};

const result = simulateSignWaiver(testParams);

console.log("\n--- TEST RESULT ---");
if (result.parq_answers.dizziness === false && testParams.parqAnswers.dizziness === true) {
    console.error("❌ BUG REPRODUCED: User answered 'true' for dizziness, but database saved 'false'.");
    process.exit(1);
} else {
    console.log("✅ Bug not found (or already fixed).");
}
