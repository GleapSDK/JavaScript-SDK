// index.d.ts as a TypeScript project compiles against it, with the options of `npm run typecheck`.
import { fileURLToPath } from 'node:url';

import { expect, test } from '@playwright/test';
import ts from 'typescript';

const FIXTURE = fileURLToPath(new URL('typings.fixture.ts', import.meta.url));

// An unused @ts-expect-error is itself an error, so no errors means every marked call was rejected.
test('index.d.ts accepts the calls in typings.fixture.ts and rejects the ones marked @ts-expect-error', () => {
  const program = ts.createProgram([FIXTURE], { strict: true, noEmit: true, types: ['node'] });
  const errors = ts.getPreEmitDiagnostics(program).map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, ' '));
  expect(errors).toEqual([]);
});
