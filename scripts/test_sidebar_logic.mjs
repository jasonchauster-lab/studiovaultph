// Test script to verify the brittle outlet detection logic
const TEST_PATHS = [
    '/studio/my-studio-slug/dashboard', // Correctly identified outlet
    '/studio/schedule',                // Correctly identified main section
    '/studio/inventory',               // UNKNOWN main section (should be section, but logic will see it as outlet)
    '/studio/marketing'                // Correctly identified main section
];

const EXCLUDED_SECTIONS = [
    'schedule', 'services', 'pricing', 'customers', 'sales', 'reports', 
    'loyalty-insights', 'marketing', 'promo', 'online-store', 'management', 
    'scan', 'settings', 'website', 'earnings', 'history', 'staff'
];

console.log('--- Sidebar Outlet Detection Test ---');

TEST_PATHS.forEach(path => {
    const parts = path.split('/').filter(Boolean);
    const isStudio = parts[0] === 'studio';
    const sectionCandidate = parts[1];
    
    const outletId = isStudio && sectionCandidate && !EXCLUDED_SECTIONS.includes(sectionCandidate) 
        ? sectionCandidate 
        : undefined;
    
    console.log(`Path: ${path.padEnd(35)} | Detected Outlet: ${outletId || '(None)'}`);
});

console.log('\nResult: If we add a new main section like "/studio/inventory", the sidebar incorrectly treats "inventory" as a studio-specific outlet because it is missing from the hardcoded exclusion list.');
