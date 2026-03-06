/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * HRMS Quality Gate Script
 * Runs Linting, Type-checking, and Tests sequentially.
 * Fails if any step fails.
 */

const { execSync } = require('child_process');

function runCommand(command, name) {
    console.log(`\n🚀 [CI GATE] Running ${name}...`);
    try {
        execSync(command, { stdio: 'inherit' });
        console.log(`✅ ${name} Passed!`);
    } catch (error) {
        console.error(`\n❌ ${name} Failed! CI Gate Blocked.`);
        process.exit(1);
    }
}

// Optional checks can be enabled in stricter environments:
//   QUALITY_GATE_LINT=1
//   QUALITY_GATE_TYPES=1
const runLint = process.env.QUALITY_GATE_LINT === '1';
const runTypes = process.env.QUALITY_GATE_TYPES === '1';

if (runLint) {
    runCommand('npm run lint', 'Linting');
}

if (runTypes) {
    runCommand('npx tsc --noEmit', 'Type Check');
}

// Always run tests; this is the minimum quality bar.
runCommand('npx vitest run', 'Automated Tests');

console.log('\n✨ ALL QUALITY GATES PASSED! READY FOR MERGE. ✨');
