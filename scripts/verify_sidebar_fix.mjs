import { RESERVED_STUDIO_SLUGS } from './lib/navigation-config.js';

const TEST_PATHS = [
    '/studio/my-studio-slug/dashboard',
    '/studio/schedule',
    '/studio/inventory', // This is now in the RESERVED list!
    '/studio/marketing'
];

console.log('--- Sidebar Outlet Detection Fix Verification ---');

TEST_PATHS.forEach(path => {
    const parts = path.split('/').filter(Boolean);
    const isStudio = parts[0] === 'studio';
    const sectionCandidate = parts[1];
    
    const outletId = isStudio && sectionCandidate && !RESERVED_STUDIO_SLUGS.includes(sectionCandidate) 
        ? sectionCandidate 
        : undefined;
    
    console.log(`Path: ${path.padEnd(35)} | Detected Outlet: ${outletId || '(None)'}`);
});

if (RESERVED_STUDIO_SLUGS.includes('inventory')) {
    console.log('\nSuccess: "inventory" is now correctly recognized as a reserved section.');
} else {
    console.log('\nFailure: "inventory" is still missing from the reserved list.');
}
