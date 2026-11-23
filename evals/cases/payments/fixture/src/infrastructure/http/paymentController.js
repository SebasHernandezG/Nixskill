import { randomUUID } from 'node:crypto';
import { retryPayment } from '../../application/payments/retryPayment.js';

export async function retryPaymentController(request, dependencies) {
  const paymentId = request.params.paymentId;
  const idempotencyKey = randomUUID();
  return retryPayment({ paymentId, idempotencyKey }, dependencies);
}
