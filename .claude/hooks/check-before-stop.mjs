// Before a turn ends: the quality check, the typings check and the tests the change reaches, once per tree. Red means
// the turn is not done. Never the full suite: several sessions share this machine and CI runs it anyway. The build and
// the smoke tests stay with CI and AGENTS.md: they need a build first.
import { join } from 'node:path';

import { projectDirOf, runStopGate } from '../../tools/quality/hooks.mjs';

const TEST_WORKERS = 4;
const TYPECHECK_TIMEOUT_MS = 60_000;
const TESTS_TIMEOUT_MS = 240_000;

const projectDir = projectDirOf(import.meta.url);

await runStopGate({
  projectDir,
  toolPath: join(projectDir, 'tools/quality/check.mjs'),
  isCode: (file) => /^(src|tools|smoke)\/.*\.(js|mjs|cjs|ts)$/.test(file) || file === 'index.d.ts',
  stepsFor: ({ existing }) => [
    {
      name: 'npm run typecheck',
      command: 'npm',
      args: ['run', '--silent', 'typecheck', '--', '--pretty', 'false'],
      requires: 'node_modules/.bin/tsc',
      timeout: TYPECHECK_TIMEOUT_MS,
    },
    ...(existing.length
      ? [
          {
            name: 'vitest related',
            command: 'npx',
            args: ['--no-install', 'vitest', 'related', ...existing, '--run', '--passWithNoTests', `--maxWorkers=${TEST_WORKERS}`],
            requires: 'node_modules/.bin/vitest',
            timeout: TESTS_TIMEOUT_MS,
          },
        ]
      : []),
  ],
});
