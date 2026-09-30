// Publishes the built game (dist/) to GitHub Pages: https://paper-rockets.github.io/Sprout-Lands/
//
//   npm run deploy        builds the game, then replaces the "gh-pages" branch with the new build
//
// The branch only ever holds the built game (no sources, no original art packs). GitHub Pages serves it.
// Phones that installed the game pick up a new build the next time they open it while online.

import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const run = (cmd, args, cwd = root) => execFileSync(cmd, args, { cwd, stdio: 'inherit', shell: process.platform === 'win32' && cmd === 'npm' });
const out = (cmd, args, cwd = root) => execFileSync(cmd, args, { cwd }).toString().trim();

run('npm', ['run', 'build']);
const dist = path.join(root, 'dist');
if (!existsSync(path.join(dist, 'index.html'))) throw new Error('dist/index.html is missing: the build did not finish');

const remote = out('git', ['remote', 'get-url', 'origin']);
const commit = out('git', ['rev-parse', '--short', 'HEAD']);
const tmp = mkdtempSync(path.join(os.tmpdir(), 'sprout-pages-'));
try {
  cpSync(dist, tmp, { recursive: true });
  writeFileSync(path.join(tmp, '.nojekyll'), '');
  run('git', ['init', '-q', '-b', 'gh-pages'], tmp);
  run('git', ['add', '-A'], tmp);
  run('git', ['-c', 'user.name=paper-rockets', '-c', 'user.email=paper-rockets@users.noreply.github.com', 'commit', '-q', '-m', `Game build from ${commit}`], tmp);
  run('git', ['push', '--force', remote, 'gh-pages'], tmp);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
console.log('Published. https://paper-rockets.github.io/Sprout-Lands/ updates in a minute or two.');
