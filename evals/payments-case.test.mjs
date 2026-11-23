import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve, sep } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const caseDir = join(dirname(fileURLToPath(import.meta.url)), 'cases', 'payments');
const fixture = join(caseDir, 'fixture');
const checker = join(caseDir, 'check.mjs');

test('payments fixture fails its hidden check and a minimal fix passes', () => {
  const workdir = mkdtempSync(join(tmpdir(), 'nixskill-payments-'));
  try {
    cpSync(fixture, workdir, { recursive: true });
    const check = () => spawnSync(process.execPath, [checker, workdir], { encoding: 'utf8' });
    assert.notEqual(check().status, 0, 'The original fixture must expose the defect');

    const controller = join(workdir, 'src', 'infrastructure', 'http', 'paymentController.js');
    writeFileSync(controller, readFileSync(controller, 'utf8').replace(
      'const idempotencyKey = randomUUID();', 'const idempotencyKey = `payment:${paymentId}`;'));
    const useCase = join(workdir, 'src', 'application', 'payments', 'retryPayment.js');
    writeFileSync(useCase, readFileSync(useCase, 'utf8').replace(
      '  const charge = await gateway.charge({',
      '  const existing = await repository.findTransactionByPaymentId(paymentId);\n  if (existing) return existing;\n\n  const charge = await gateway.charge({'));
    const regression = join(workdir, 'test', 'retryPayment.test.js');
    writeFileSync(regression, `${readFileSync(regression, 'utf8')}\n` +
      `test('a retry after a lost response does not create a second charge', async () => {
  const repository = createPaymentRepository({ payments: [{ id: 'retry', amountCents: 900, status: 'failed' }] });
  const gateway = createPaymentGateway({ loseFirstResponse: true });
  await assert.rejects(retryPaymentController({ params: { paymentId: 'retry' } }, { repository, gateway }));
  await retryPaymentController({ params: { paymentId: 'retry' } }, { repository, gateway });
  assert.equal(gateway.createdCount, 1);
  assert.equal(repository.transactions.length, 1);
});\n`);

    const visible = spawnSync(process.execPath, ['--test'], { cwd: workdir, encoding: 'utf8' });
    assert.equal(visible.status, 0, visible.stderr || visible.stdout);
    const hidden = check();
    assert.equal(hidden.status, 0, hidden.stderr || hidden.stdout);
  } finally {
    if (!resolve(workdir).startsWith(resolve(tmpdir()) + sep)) throw new Error('Unsafe test cleanup path');
    rmSync(workdir, { recursive: true, force: true });
  }
});
