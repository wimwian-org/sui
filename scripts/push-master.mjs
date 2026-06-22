// Fast-forwards master → dev on GitHub without needing local push rights to master.
// Reads GITHUB_TOKEN and GITHUB_ORG from .env

import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const env = Object.fromEntries(
  readFileSync('.env', 'utf8')
    .split('\n')
    .filter((l) => l.trim() && !l.trim().startsWith('#'))
    .map((l) => {
      const idx = l.indexOf('=');
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
    })
    .filter(([k]) => k),
);

const token = env.GITHUB_TOKEN;
const org = env.GITHUB_ORG || 'wimwian-org';
const repo = 'sui';

if (!token) {
  console.error('GITHUB_TOKEN not found in .env');
  process.exit(1);
}

execSync('git fetch origin dev', { stdio: 'inherit' });
const devSha = execSync('git rev-parse origin/dev', { encoding: 'utf8' }).trim();
console.log(`Pushing dev (${devSha.slice(0, 7)}) → master…`);

const res = await fetch(`https://api.github.com/repos/${org}/${repo}/git/refs/heads/master`, {
  method: 'PATCH',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  },
  body: JSON.stringify({ sha: devSha, force: false }),
});

const data = await res.json();
if (!res.ok) {
  console.error(`GitHub API error: ${data.message}`);
  process.exit(1);
}

console.log(`master → ${data.object?.sha?.slice(0, 7) ?? '???'} ✓`);
