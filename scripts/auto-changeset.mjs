// post-commit hook. Reads the just-made commit, and if it's a consumer-
// visible conventional commit (feat / fix / perf / breaking), generates a
// matching .changeset/auto-*.md and AMENDS it into the same commit.

import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';

function git(cmd) {
  return execSync(`git ${cmd}`, { encoding: 'utf8' }).trim();
}

// Skip merge commits.
const parents = git('log -1 --pretty=%P').split(/\s+/).filter(Boolean);
if (parents.length > 1) process.exit(0);

const subject = git('log -1 --pretty=%s');
const body = git('log -1 --pretty=%b');
const m = subject.match(/^(\w+)(?:\([^)]+\))?(!)?:\s*(.+)$/);
if (!m) process.exit(0);
const [, type, bang, summary] = m;

const breaking = bang === '!' || /BREAKING CHANGE/i.test(body);
let bump;
if (breaking) bump = 'major';
else if (type === 'feat') bump = 'minor';
else if (type === 'fix' || type === 'perf') bump = 'patch';
else process.exit(0);

// --diff-filter=A: only newly-added paths. A commit that merely *touches*
// a pre-existing .changeset/auto-*.md must still generate its own changeset.
const addedFiles = git('show --diff-filter=A --pretty= --name-only HEAD').split('\n').filter(Boolean);

// Defer to a hand-written changeset newly added in this commit.
const hasManual = addedFiles.some(
  (f) => f.startsWith('.changeset/') && f.endsWith('.md') && !f.includes('auto-') && f !== '.changeset/README.md',
);
if (hasManual) process.exit(0);

// Break the recursive loop: if we already added an auto-* in this commit, stop.
const hasAuto = addedFiles.some((f) => f.startsWith('.changeset/auto-') && f.endsWith('.md'));
if (hasAuto) process.exit(0);

const pkg = JSON.parse(readFileSync('package.json', 'utf8')).name;
mkdirSync('.changeset', { recursive: true });
const slug = randomBytes(3).toString('hex');
const file = `.changeset/auto-${slug}.md`;
writeFileSync(file, `---\n"${pkg}": ${bump}\n---\n\n${summary}\n`);

execSync(`git add ${file}`);
execSync(`git commit --amend --no-edit --no-verify`, { stdio: 'inherit' });
