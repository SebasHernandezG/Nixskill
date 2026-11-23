import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const workdir = resolve(process.argv[2]);
const fixture = resolve(dirname(fileURLToPath(import.meta.url)), 'fixture');
const load = async (path) => import(pathToFileURL(resolve(workdir, path)));
const { retryPaymentController } = await load('src/infrastructure/http/paymentController.js');
const { createPaymentRepository } = await load('src/infrastructure/persistence/inMemoryPaymentRepository.js');
const { createPaymentGateway } = await load('src/infrastructure/gateway/inMemoryPaymentGateway.js');

for (const path of [
  'src/domain/ports/paymentRepository.js',
  'src/infrastructure/gateway/inMemoryPaymentGateway.js',
]) {
  assert.equal(readFileSync(resolve(workdir, path), 'utf8'), readFileSync(resolve(fixture, path), 'utf8'),
    `${path} is a frozen contract or external gateway simulation`);
}
const focusedTestChanged = readdirSync(resolve(workdir, 'test'))
  .filter((name) => /\.(test|spec)\.[cm]?js$/.test(name))
  .some((name) => {
    const candidate = readFileSync(resolve(workdir, 'test', name), 'utf8');
    const original = resolve(fixture, 'test', name);
    return !existsSync(original) || candidate !== readFileSync(original, 'utf8');
  });
assert.ok(focusedTestChanged, 'Add or adjust a focused regression test');

const request = (paymentId) => ({ params: { paymentId } });
const repository = createPaymentRepository({
  payments: [{ id: 'lost-response', amountCents: 900, status: 'failed' }],
});
const gateway = createPaymentGateway({ loseFirstResponse: true });
await assert.rejects(retryPaymentController(request('lost-response'), { repository, gateway }),
  /Gateway response lost/);
assert.equal(repository.transactions.length, 0);

const recovered = await retryPaymentController(request('lost-response'), { repository, gateway });
assert.equal(repository.transactions.length, 1);
assert.equal(gateway.createdCount, 1);
assert.equal(recovered.gatewayTransactionId, 'gateway-1');
assert.equal(gateway.calls[0].idempotencyKey, gateway.calls[1].idempotencyKey,
  'A retry must reuse the original idempotency key');

const repeated = await retryPaymentController(request('lost-response'), { repository, gateway });
assert.deepEqual(repeated, recovered);
assert.equal(repository.transactions.length, 1);
assert.equal(gateway.createdCount, 1);

const processedRepository = createPaymentRepository({
  payments: [{ id: 'already-processed', amountCents: 500, status: 'processed' }],
  transactions: [{ id: 'original-row', paymentId: 'already-processed',
    gatewayTransactionId: 'gateway-original', idempotencyKey: 'original-key' }],
});
const processedGateway = createPaymentGateway();
const existing = await retryPaymentController(request('already-processed'), {
  repository: processedRepository, gateway: processedGateway,
});
assert.equal(existing.id, 'original-row');
assert.equal(processedRepository.transactions.length, 1);
assert.equal(processedGateway.createdCount, 0);

const distinctRepository = createPaymentRepository({ payments: [
  { id: 'different-a', amountCents: 100, status: 'failed' },
  { id: 'different-b', amountCents: 200, status: 'failed' },
] });
const distinctGateway = createPaymentGateway();
await retryPaymentController(request('different-a'), { repository: distinctRepository, gateway: distinctGateway });
await retryPaymentController(request('different-b'), { repository: distinctRepository, gateway: distinctGateway });
assert.equal(distinctGateway.createdCount, 2);
assert.equal(distinctRepository.transactions.length, 2);
assert.notEqual(distinctGateway.calls[0].idempotencyKey, distinctGateway.calls[1].idempotencyKey);
