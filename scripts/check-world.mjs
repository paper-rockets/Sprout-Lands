// "Can a kid get stuck?" and "does every name point at something real?" for the whole game.
// Prints what it finds and fails (exit code 1) if anything must be fixed.
//
//   npm run check:world
//   CONTENT_PACKAGE=emmas-adventure npm run check:world     (another gift game)

import { checkContent } from '../src/engine/content/checkContent.js';
import { loadContentFromDisk } from './tools/node-content.mjs';

let report;
try {
  report = checkContent(loadContentFromDisk());
} catch (e) {
  console.log(`PROBLEM: the content could not be loaded: ${e.message}`);
  process.exit(1);
}
for (const e of report.errors) console.log(`PROBLEM: ${e}`);
for (const w of report.warnings) console.log(`note:    ${w}`);
console.log(`\n${report.stats.reachableTiles ?? '?'} tiles can be walked to from the start; ${report.errors.length} problem(s), ${report.warnings.length} note(s).`);
console.log(report.errors.length ? 'FIX the problems above.' : 'World check passed: nothing is out of reach.');
process.exit(report.errors.length ? 1 : 0);
