import assert from 'node:assert/strict';
import test from 'node:test';
import { retryPaymentController } from '../src/infrastructure/http/paymentController.js';
import { createPaymentRepository } from '../src/infrastructure/persistence/inMemoryPaymentRepository.js';
import { createPaymentGateway } from '../src/infrastructure/gateway/inMemoryPaymentGateway.js';

test('a first payment attempt stores one transaction', async () => {
  const repository = createPaymentRepository({
    payments: [{ id: 'payment-1', amountCents: 900, status: 'failed' }],
  });
  const gateway = createPaymentGateway();
  const transaction = await retryPaymentController(
    { params: { paymentId: 'payment-1' } }, { repository, gateway },
  );
  assert.equal(transaction.paymentId, 'payment-1');
  assert.equal(repository.transactions.length, 1);
  assert.equal(gateway.createdCount, 1);
});
